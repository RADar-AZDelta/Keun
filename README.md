![Keun](static/keun_logo.jpg)
===========

**Keun** ([West Flemish](https://en.wikipedia.org/wiki/West_Flemish) for [rabbit](https://anw-ivdnt-org.translate.goog/article/keun?_x_tr_sl=nl&_x_tr_tl=en&_x_tr_hl=nl&_x_tr_pto=wapp)) is a web based modern variant of the [Usagi](https://www.ohdsi.org/web/wiki/doku.php?id=documentation:software:usagi) OMOP [CDM](https://www.ohdsi.org/data-standardization/) mapping tool.

Introduction
============

Although [Usagi](https://www.ohdsi.org/web/wiki/doku.php?id=documentation:software:usagi) does the job, it has some issues:
- It is slow (especially when loading large CSV's)
- You need to install the dictionaries from Athena
- It requires software installation (Java)
- No [four-eye principle](https://en.wiktionary.org/wiki/four-eye_principle)
- It doesn't do translations
- The search result of Usagi are not on par with [Athena](https://athena.ohdsi.org/)

Therefore we decided to make a modern web variant of Usagi:
- No installation, just run it from your browser
- Made with [Svelte](https://svelte.dev/): cybernetically enhanced web apps
- Includes the super fast [svelte-radar-datatable](https://github.com/RADar-AZDelta/svelte-radar-datatable) component. So it can handle very, very lage CSV files. It uses the [Arquero](https://uwdata.github.io/arquero/) library in a web worker.
- Uses [Athena](https://athena.ohdsi.org/) in the background
- Translation are done by [Bergamot](https://browser.mt/): machine translation done locally in your browser

Usage
============

When the CSV file is loaded, the row will be mapped automatically with the first value Athena gives. This mapping is a suggestion and should always be checked.

There are certain options that the user can change. On the upper right side of the page there is a button for the settings.
When this button is clicked, a pop-up will appear with all the settings. At this moment there are two settings: language & multiple mapping.

The multiple mapping choice let's the user choose if he wants to map a row to multiple concepts. If the user maps a row to multiple concepts, this creates extra rows that are inserted in the back of the file.

The language option let's the user choose a language. This is a feature that will be implemented in the future to translate the values to get better results from Athena.

When the user is ready with the mapping, he can download the file with the button on the right upper side of the page.

4-eyes-principal
============

![4-eyes-principal](https://user-images.githubusercontent.com/71939691/236427929-1396d8ee-81ff-4af9-aedb-06666fe5f29b.png)


Development
============

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

## User manual
### User
When accessing Keun for the first time there will be a pop-up that asks for your name. This is needed to fill in who has mapped a row. Your name can always be changed in the upper right side with a click on the button with your name.

![author](https://github.com/RADar-AZDelta/Keun/assets/71939691/3166759f-6150-4d60-971d-910b6fc0b717)
![author-popup](https://github.com/RADar-AZDelta/Keun/assets/71939691/b2f79fb4-5d4f-4975-9cfe-d42e512784d6)

### Settings
There are also some settings that can be customised. These settings can be accessed also at the upper right side with a click on the button with a gear. The settings that can be changed are the following:

- Enable mapping to multiple concepts
- Enable automapping
- Language of concepts

The option to enable mapping to multiple concepts let's the user map multiple concepts to a row. Per extra concept after the first one, there will be a new row inserted at the end of the table.

The option for automapping let's the system map every row automatically. The sourceName will be extracted per row and translated from the chosen language in the settings to English. This value will then be placed in a API call to Athena. The first value that Athena gives back will then be mapped to that row.

![automap](https://github.com/RADar-AZDelta/Keun/assets/71939691/3f4d6203-b840-4722-a28b-9654f1fe2f0f)

### Upload & download
To upload a CSV-file, the user can click on the upload button on the upper side in the middle of the page.

![upload](https://github.com/RADar-AZDelta/Keun/assets/71939691/386ab757-b50e-4b50-aa3b-b9c99663d502)

The mapped CSV-file can also be downloaded again. To download the file the user needs to click the download button on the upper side in the middle of the page.

![download](https://github.com/RADar-AZDelta/Keun/assets/71939691/276e2a83-e4d8-45c4-8cc6-302e14990c8e)

### Actions
There are a couple of actions the user can utilize per row. These actions can be found on the left side of the table. The actions are the following:

- Map
- Delete
- Approve
- Flag
- Unapprove

###### Map
To map a row the mapping button can be clicked and a pop-up will open. On the left side of the pop-up, some filters can be applied to have better results. When clicked on a certain filter, the user will be able to enable certain options. These options can also be removed in the last filter called "activated filters".

![filters](https://github.com/RADar-AZDelta/Keun/assets/71939691/f581a9a0-d2f1-48b2-8c48-d65b571b0bd7)

At the upper side of the pop-up there is a small table with the current selected row. The user can navigate to other rows with the arrow buttons. At the right side of the selected row there are 2 fields with options. The upper one is to select the equality of the mapping and the other one is to filter the results of Athena on the sourceName or sourceCode.

![upperside](https://github.com/RADar-AZDelta/Keun/assets/71939691/1321465d-466f-4a67-b577-9558e271f776)

In the middle there is a big table with the possible results for this mapping. A row can be mapped with the button on the right side of that row. When the button is clicked the row will be updated with the chosen concept.

On the right side of the table there are two extra input fields. One is for a possible assigned reviewer, but this is not mandatory. The other one is to put a comment with the mapping.

Here are some examples where a row is mapped with a single concepts and with multiple concepts.

![singlemapping](https://github.com/RADar-AZDelta/Keun/assets/71939691/086e130c-276a-413a-9892-92cbb8202ccf)

![multiplemapping](https://github.com/RADar-AZDelta/Keun/assets/71939691/27f4a26d-5a4a-434c-97cc-6da6fea467af)

###### Delete
A row can be deleted if the user by accident maps a concept to a row. This action can be done with a click of the delete button of that row.

###### Approve, flag & unapprove
The mapping of a row can be approved, flagged or unapproved. According to these conditions the row will get a color so that the user sees which rows need to be worked on. There is a 4-eyes principle applied so the first author can't approve a mapping. He can only flag or unapprove the mapping. The second author can approve, flag or unapprove a mapping of a row.

![actions](https://github.com/RADar-AZDelta/Keun/assets/71939691/94ab341a-4463-437d-b25c-3a609a74ef48)

License
========

Copyright © 2023 [RADar-AZDelta](mailto:radar@azdelta.be).
Released under the [GNU General Public License v3.0](LICENSE).
