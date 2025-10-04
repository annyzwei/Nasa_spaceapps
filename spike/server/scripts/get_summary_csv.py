import pandas as pd
from xml.etree import ElementTree as ET
import requests

DATA_CSV = "./../data/SB_publication_PMC.csv"
OUTPUT_CSV_PATH = "./../data/summary"

# def medline_to_dict(medline_text):
#     data = {}
#     current_tag = None  # track current field
#     for line in medline_text.strip().split("\n"):
#         if "  - " in line:
#             tag, value = line.split("  - ", 1)
#             value = value.strip()  # remove extra spaces / \r
#             current_tag = tag

#             if tag == "AU":
#                 data.setdefault("AU", []).append(value)
#             elif tag == "PT":
#                 # PT can be multiple entries
#                 if "PT" in data:
#                     if isinstance(data["PT"], list):
#                         data["PT"].append(value)
#                     else:
#                         data["PT"] = [data["PT"], value]
#                 else:
#                     data["PT"] = [value]
#             else:
#                 data[tag] = value

#         elif current_tag in ["AB"]:  # continuation line for abstract
#             data[current_tag] += " " + line.strip()  # append with space

#     return data

# def get_pmid(pmc_id):
#     url = "https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/"
#     params = {
#         "format": "json",
#         "ids": pmc_id
#     }
#     try:
#         response = requests.get(url, params=params)
#         response.raise_for_status()
#         data = response.json()  # Parse JSON
#         # API returns a list under 'records'
#         records = data.get('records', [])
#         if records and 'pmid' in records[0]:
#             return records[0]['pmid']
#         else:
#             return None
#     except requests.exceptions.RequestException as e:
#         print(f"Error fetching {pmc_id}: {e}")
#         return None

# # Get authors, date, pub type, abstract


def fetch_pmc_data(pmc_id):
    # remove "PMC" prefix
    pmc_numeric = pmc_id[3:]
    url = "https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/"
    params = {
        "verb": "GetRecord",
        "identifier": f"oai:pubmedcentral.nih.gov:{pmc_numeric}",
        "metadataPrefix": "pmc_fm"
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        xml_data = response.text

        # parse XML
        root = ET.fromstring(xml_data)
        
        ns = {
            'oai': 'http://www.openarchives.org/OAI/2.0/',
            'jats': 'https://jats.nlm.nih.gov/ns/archiving/1.4/'
        }
        
        # PMID
        pmid = root.findtext('.//jats:article-id[@pub-id-type="pmid"]', namespaces=ns)
        
        # Authors: list of "Surname, Given Names"
        authors = []
        for contrib in root.findall('.//jats:contrib[@contrib-type="author"]', namespaces=ns):
            surname = contrib.findtext('jats:name/jats:surname', namespaces=ns)
            given = contrib.findtext('jats:name/jats:given-names', namespaces=ns)
            if surname and given:
                authors.append(f"{surname}, {given}")
        
        # Publication date (take year of collection)
        event_date = root.find(
            ".//jats:event[@event-type='pmc-release']/jats:date",
            ns
        )

        if event_date is not None:
            day = event_date.findtext("jats:day", namespaces=ns).zfill(2)
            month = event_date.findtext("jats:month", namespaces=ns).zfill(2)
            year = event_date.findtext("jats:year", namespaces=ns)
            release_date = f"{year}-{month}-{day}"
        else:
            release_date = None
        
        # Abstract text
        abstract_el = root.find('.//jats:abstract', namespaces=ns)
        abstract = ""
        if abstract_el is not None:
            abstract = " ".join([p.text.strip() for p in abstract_el.findall('jats:p', namespaces=ns) if p.text])
        
        return pmid, "; ".join(authors), release_date, abstract
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {pmc_id}: {e}")
        return None, None, None, None

def get_metadata(df):
    """
    Apply fetch_pmc_data to each row and create new columns
    """
    results = df['pmc_id'].apply(fetch_pmc_data)
    df[['pmid', 'AU', 'DP', 'AB']] = pd.DataFrame(results.tolist(), index=df.index)

# def get_metadata(df):
#     # use fetch_pmc_data and add in the additional columns of:
#     # pmid, author, publication date, abstract

def main():
    df = pd.read_csv(DATA_CSV)
    df = df.head(10) # get the first 10 entries
    
    df["pmc_id"] = df['Link'].str.extract(r'articles/(PMC\d+)/?')
    get_metadata(df)
    
    df.to_csv(f"{OUTPUT_CSV_PATH}.csv", index=False) 
    df.to_json(f"{OUTPUT_CSV_PATH}.json", orient="records", force_ascii=False, indent=4)
    


if __name__ == "__main__":
    main()