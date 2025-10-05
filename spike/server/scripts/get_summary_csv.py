import pandas as pd
import json
from xml.etree import ElementTree as ET
import requests
import time

DATA_CSV = "./../../backend/data/SB_publication_PMC.csv"
OUTPUT_CSV_PATH = "./../data/summary"
OUTPUT_TAGS_PATH = "./../data/all_tags"

all_tags = set()

def fetch_pmc_data(pmc_id, retries=5, delay=1):
    """
    Fetch PMC metadata with throttling and retry for 429 errors.
    """
    pmc_numeric = pmc_id[3:]  # remove "PMC" prefix
    url = "https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/"
    params = {
        "verb": "GetRecord",
        "identifier": f"oai:pubmedcentral.nih.gov:{pmc_numeric}",
        "metadataPrefix": "pmc_fm"
    }

    for attempt in range(retries):
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()

            xml_data = response.text
            root = ET.fromstring(xml_data)
            ns = {
                'oai': 'http://www.openarchives.org/OAI/2.0/',
                'jats': 'https://jats.nlm.nih.gov/ns/archiving/1.4/'
            }

            # PMID
            pmid = root.findtext('.//jats:article-id[@pub-id-type="pmid"]', namespaces=ns)

            # Authors
            authors = []
            for contrib in root.findall('.//jats:contrib[@contrib-type="author"]', namespaces=ns):
                surname = contrib.findtext('jats:name/jats:surname', namespaces=ns)
                given = contrib.findtext('jats:name/jats:given-names', namespaces=ns)
                if surname and given:
                    authors.append(f"{surname}, {given}")

            # Publication date
            event_date = root.find(".//jats:event[@event-type='pmc-release']/jats:date", ns)
            if event_date is not None:
                day = event_date.findtext("jats:day", namespaces=ns)
                month = event_date.findtext("jats:month", namespaces=ns)
                year = event_date.findtext("jats:year", namespaces=ns)
                release_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}" if day and month and year else None
            else:
                release_date = None

            # Abstract
            abstract_el = root.find('.//jats:abstract', namespaces=ns)
            abstract = ""
            if abstract_el is not None:
                abstract = " ".join([p.text.strip() for p in abstract_el.findall('jats:p', namespaces=ns) if p.text])

            # Tags
            tags = {subj.text.strip() for subj in root.findall('.//jats:subject', namespaces=ns) if subj.text}
            all_tags.update(tags)

            # Throttle between requests
            time.sleep(0.3)  # 300ms delay

            return pmid, "; ".join(authors), release_date, abstract, tags

        except requests.exceptions.HTTPError as e:
            if response.status_code == 429:
                print(f"Rate limited for {pmc_id}, retrying in {delay} seconds...")
                time.sleep(delay)
                delay *= 2  # exponential backoff
            else:
                print(f"HTTP error fetching {pmc_id}: {e}")
                return None, None, None, None, {}
        except Exception as e:
            print(f"Error fetching {pmc_id}: {e}")
            return None, None, None, None, {}

    print(f"Failed to fetch {pmc_id} after {retries} retries")
    return None, None, None, None, {}

def get_metadata(df):
    results = df['pmc_id'].apply(fetch_pmc_data)
    df[['pmid', 'AU', 'DP', 'AB', 'tags']] = pd.DataFrame(results.tolist(), index=df.index)

def main():
    df = pd.read_csv(DATA_CSV)
    df = df.head(40)  # process first 40 rows for testing

    df["pmc_id"] = df['Link'].str.extract(r'articles/(PMC\d+)/?')

    get_metadata(df)

    df.to_csv(f"{OUTPUT_CSV_PATH}.csv", index=False)
    df.to_json(f"{OUTPUT_CSV_PATH}.json", orient="records", force_ascii=False, indent=4)

    my_list = list(all_tags)
    with open(f"{OUTPUT_TAGS_PATH}.json", "w") as f:
        json.dump(my_list, f, indent=4)

if __name__ == "__main__":
    main()


# import pandas as pd
# import json
# from xml.etree import ElementTree as ET
# import requests

# DATA_CSV = "./../data/SB_publication_PMC.csv"
# OUTPUT_CSV_PATH = "./../data/summary"

# OUTPUT_TAGS_PATH = "./../data/all_tags"
# all_tags = set()
# def fetch_pmc_data(pmc_id):
#     # remove "PMC" prefix
#     pmc_numeric = pmc_id[3:]
#     url = "https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/"
#     params = {
#         "verb": "GetRecord",
#         "identifier": f"oai:pubmedcentral.nih.gov:{pmc_numeric}",
#         "metadataPrefix": "pmc_fm"
#     }

#     try:
#         response = requests.get(url, params=params)
#         response.raise_for_status()
#         xml_data = response.text

#         # parse XML
#         root = ET.fromstring(xml_data)
        
#         ns = {
#             'oai': 'http://www.openarchives.org/OAI/2.0/',
#             'jats': 'https://jats.nlm.nih.gov/ns/archiving/1.4/'
#         }
        
#         # PMID
#         pmid = root.findtext('.//jats:article-id[@pub-id-type="pmid"]', namespaces=ns)
        
#         # Authors: list of "Surname, Given Names"
#         authors = []
#         for contrib in root.findall('.//jats:contrib[@contrib-type="author"]', namespaces=ns):
#             surname = contrib.findtext('jats:name/jats:surname', namespaces=ns)
#             given = contrib.findtext('jats:name/jats:given-names', namespaces=ns)
#             if surname and given:
#                 authors.append(f"{surname}, {given}")
        
#         # Publication date (take year of collection)
#         event_date = root.find(
#             ".//jats:event[@event-type='pmc-release']/jats:date",
#             ns
#         )

#         if event_date is not None:
#             day = event_date.findtext("jats:day", namespaces=ns).zfill(2)
#             month = event_date.findtext("jats:month", namespaces=ns).zfill(2)
#             year = event_date.findtext("jats:year", namespaces=ns)
#             release_date = f"{year}-{month}-{day}"
#         else:
#             release_date = None
        
#         # Abstract text
#         abstract_el = root.find('.//jats:abstract', namespaces=ns)
#         abstract = ""
#         if abstract_el is not None:
#             abstract = " ".join([p.text.strip() for p in abstract_el.findall('jats:p', namespaces=ns) if p.text])
        
        
#         tags = [subj.text.strip() for subj in root.findall('.//jats:subject', namespaces=ns) if subj.text]
#         all_tags.update(tags)
#         return pmid, "; ".join(authors), release_date, abstract, tags
    
#     except requests.exceptions.RequestException as e:
#         print(f"Error fetching {pmc_id}: {e}")
#         return None, None, None, None

# def get_metadata(df):
#     """
#     Apply fetch_pmc_data to each row and create new columns
#     """
#     results = df['pmc_id'].apply(fetch_pmc_data)
#     df[['pmid', 'AU', 'DP', 'AB', 'tags']] = pd.DataFrame(results.tolist(), index=df.index)

# # def get_metadata(df):
# #     # use fetch_pmc_data and add in the additional columns of:
# #     # pmid, author, publication date, abstract

# def main():
#     df = pd.read_csv(DATA_CSV)
#     df = df.head(40) # get the first 10 entries
    
#     df["pmc_id"] = df['Link'].str.extract(r'articles/(PMC\d+)/?')

#     get_metadata(df)
    
#     df.to_csv(f"{OUTPUT_CSV_PATH}.csv", index=False) 
#     df.to_json(f"{OUTPUT_CSV_PATH}.json", orient="records", force_ascii=False, indent=4)
    
#     my_list = list(all_tags)

#     with open(f"{OUTPUT_TAGS_PATH}.json", "w") as f:
#         json.dump(my_list, f)
    


# if __name__ == "__main__":
#     main()