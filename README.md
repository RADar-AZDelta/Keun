# POC-Keun

POC-Keun is a mapping tool for hospitals where a CSV file can be inserted to map the data to OMOP data from Athena. The user can perform certain actions to modify the mapping status (APPROVE, FLAG, UNAPPROVE). There is a 4-eyes principal implemented so the mapper can't approve his mapping. There needs to be an other author that checks the mapping.

![4-eyes-principal](https://user-images.githubusercontent.com/71939691/236427929-1396d8ee-81ff-4af9-aedb-06666fe5f29b.png)

When the CSV file is loaded, the row will be mapped automatically with the first value Athena gives. This mapping is a suggestion and should always be checked.

# Usage

Clone the project

```bash
git clone git@github.com:RADar-AZDelta/Keun.git
cd ./Keun/
pnpm install
```
Start dev server

```bash
pnpm dev
```

Start build

```bash
pnpm build
```

## Options

There are certain options that the user can change. On the upper right side of the page there is a button for the settings.
When this button is clicked, a pop-up will appear with all the settings. At this moment there are two settings: language & multiple mapping.

The multiple mapping choice let's the user choose if he wants to map a row to multiple concepts. If the user maps a row to multiple concepts, this creates extra rows that are inserted in the back of the file.

The language option let's the user choose a language. This is a feature that will be implemented in the future to translate the values to get better results from Athena.

## Download

When the user is ready with the mapping, he can download the file with the button on the right upper side of the page.

## Author

On the right upper side, there is a button with the username. When clicked, a pop-up will appear where the user can set his username.
