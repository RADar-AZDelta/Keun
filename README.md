# Keun
####  Clone the repo
```bash
git clone git@github.com:RADar-AZDelta/POC-Keun.git
cd .\POC-Keun\
git submodule update --init --recursive
cd .\lib\RADar-DataTable\ && pnpm build && cd ../..
pnpm install
```

#### Running dev server
```bash
pnpm dev
```

#### Create build

```bash
pnpm build
```

#### Explanation
This project is a mapping tool for hospitals where they can load in a CSV in different ways (Drag and drop or from an API) and map it with the OMOP data from Athena. 
When you load in a CSV-file you can perform certain actions on the table (sort, filter and paginate). When you click on a row, a pop-up will open on the screen where you can filter for OMOP data. You'll see a table appear with the OMOP data in it and here you'll be able to select a row to map the data with.