"""Read the private AISG workbook locally; never publish the resulting payload."""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import posixpath
import re
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
FACETS = {name.lower(): name for name in [
    "Personalization", "Agency", "Authenticity", "Creativity", "Collaboration", "Taking Action",
    "Pending selection", "Other"
]}
HEADERS = ["Email", "Last, first name", "Chosen Domain", "Chosen Facet", "Goal 1 goal statement"]


def read_records(path, academic_year="2026-27"):
    with ZipFile(path) as archive:
        shared = []
        if "xl/sharedStrings.xml" in archive.namelist():
            shared = ["".join(node.itertext()) for node in ET.fromstring(
                archive.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relations = {node.attrib["Id"]: node.attrib["Target"] for node in ET.fromstring(
            archive.read("xl/_rels/workbook.xml.rels"))}
        sheets = [node for node in workbook.find("s:sheets", NS) if node.attrib["name"] == "Goals"]
        if len(sheets) != 1:
            raise ValueError("Expected one worksheet named Goals.")
        target = relations[sheets[0].attrib[RID]]
        sheet_path = target.lstrip("/") if target.startswith("/") else posixpath.normpath("xl/" + target)
        rows = ET.fromstring(archive.read(sheet_path)).findall("s:sheetData/s:row", NS)
        table = []
        for row in rows:
            values = {}
            for cell in row.findall("s:c", NS):
                column = re.sub(r"\d", "", cell.attrib["r"])
                value = cell.find("s:v", NS)
                if cell.attrib.get("t") == "s" and value is not None:
                    text = shared[int(value.text)]
                elif cell.attrib.get("t") == "inlineStr":
                    text = "".join(cell.find("s:is", NS).itertext())
                else:
                    text = value.text if value is not None else ""
                values[column] = text or ""
            table.append((int(row.attrib["r"]), values))
    if not table or [table[0][1].get(c, "").strip() for c in "ABCDE"] != HEADERS:
        raise ValueError("Workbook headers do not match the AISG Goals worksheet.")
    records = []
    seen = set()
    for number, values in table[1:]:
        if not any(str(value).strip() for value in values.values()):
            continue
        email = values.get("A", "").strip().lower()
        if not re.fullmatch(r"[^@\s]+@aisgz\.org", email):
            raise ValueError("Missing or unsupported AISG email in workbook row " + str(number))
        if email in seen:
            raise ValueError("Duplicate email in workbook row " + str(number))
        seen.add(email)
        facet = re.sub(r"^\s*\d+\s*[.):\-]?\s*", "", values.get("D", "")).strip()
        if facet and facet.lower() not in FACETS:
            raise ValueError("Unrecognised chosen facet in workbook row " + str(number))
        record = {
            "email": email,
            "academicYear": academic_year,
            "chosenFacet": FACETS.get(facet.lower(), ""),
            "chosenDomain": values.get("C", "").strip(),
            "professionalGoal": values.get("E", "").strip()
        }
        if any(len(record[key]) > 63000 for key in ["chosenDomain", "professionalGoal"]):
            raise ValueError("SharePoint text limit exceeded in workbook row " + str(number))
        records.append(record)
    if not records:
        raise ValueError("No staff goal records found.")
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--academic-year", default="2026-27")
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if not re.fullmatch(r"\d{4}-\d{2}", args.academic_year):
        parser.error("Use an academic year such as 2026-27.")
    records = read_records(args.workbook, args.academic_year)
    summary = {
        "records": len(records),
        "unique_emails": len({row["email"] for row in records}),
        "pending_or_missing_facets": sum(row["chosenFacet"] in ["", "Pending selection"] for row in records),
        "missing_domains": sum(not row["chosenDomain"] for row in records),
        "missing_goals": sum(not row["professionalGoal"] for row in records)
    }
    print(json.dumps(summary))
    if args.check_only:
        return
    if not args.output:
        parser.error("Use --check-only or --output with a private path outside the website checkout.")
    output = args.output.expanduser().resolve()
    checkout = Path(__file__).resolve().parents[1]
    if output.is_relative_to(checkout):
        parser.error("Private goal data must be saved outside the website checkout.")
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schemaVersion": 1,
        "academicYear": args.academic_year,
        "sourceSha256": hashlib.sha256(args.workbook.read_bytes()).hexdigest(),
        "records": records
    }
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
        json.dump(payload, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print("Private import payload written outside the website checkout.")


if __name__ == "__main__":
    main()
