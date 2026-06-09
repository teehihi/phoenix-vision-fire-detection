import urllib.request
import os

def download_file():
    file_id = '12ZUgw6NmtuVrUQHK-4-Qq5Xams-QI83_'
    url = f'https://docs.google.com/uc?export=download&id={file_id}'
    output = 'ai-service/models/fire.pt'
    
    print(f"Starting download for fire.pt...")
    os.makedirs(os.path.dirname(output), exist_ok=True)
    
    # Google Drive might require confirm token for larger files
    # We can try direct retrieve first
    try:
        urllib.request.urlretrieve(url, output)
        print(f"Downloaded successfully to {output}!")
    except Exception as e:
        print(f"Error downloading: {e}")

if __name__ == "__main__":
    download_file()
