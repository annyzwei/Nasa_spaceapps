import pandas as pd
import requests

DATA_CSV = "./../data/SB_publication_PMC.csv"
OUTPUT_CSV_PATH = "./../data/summary"

def medline_to_dict(medline_text):
    data = {}
    current_tag = None  # track current field
    for line in medline_text.strip().split("\n"):
        if "  - " in line:
            tag, value = line.split("  - ", 1)
            value = value.strip()  # remove extra spaces / \r
            current_tag = tag

            if tag == "AU":
                data.setdefault("AU", []).append(value)
            elif tag == "PT":
                # PT can be multiple entries
                if "PT" in data:
                    if isinstance(data["PT"], list):
                        data["PT"].append(value)
                    else:
                        data["PT"] = [data["PT"], value]
                else:
                    data["PT"] = [value]
            else:
                data[tag] = value

        elif current_tag in ["AB"]:  # continuation line for abstract
            data[current_tag] += " " + line.strip()  # append with space

    return data

def get_pmid(pmc_id):
    url = "https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/"
    params = {
        "format": "json",
        "ids": pmc_id
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()  # Parse JSON
        # API returns a list under 'records'
        records = data.get('records', [])
        if records and 'pmid' in records[0]:
            return records[0]['pmid']
        else:
            return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {pmc_id}: {e}")
        return None

# Get authors, date, pub type, abstract
def get_metadata(pmc_id):
    url = "https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pmc/"
    params = {
        "format": "medline",
        "id": pmc_id[3:]
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.text
        # API returns a medline format string
        data = medline_to_dict(data)

        return data["AU"], data["DP"], data["PT"], data["AB"]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {pmc_id}: {e}")
        return None, None, None, None
    


def main():
    df = pd.read_csv(DATA_CSV)
    df = df.head(10) # get the first 10 entries
    df['pmc_id'] = df['Link'].str.extract(r'articles/(PMC\d+)/?')
    df['pm_id'] = df['pmc_id'].apply(get_pmid)
   
    # Get authors, date, pub type, abstract
    df[['authors', 'pub_date', 'pub_type', 'abstract']] = df['pmc_id'].apply(get_metadata).apply(pd.Series)
    
    df.to_csv(f"{OUTPUT_CSV_PATH}.csv", index=False) 
    df.to_json(f"{OUTPUT_CSV_PATH}.json", orient="records", force_ascii=False, indent=4)
    


if __name__ == "__main__":
    main()