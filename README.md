![Keun](static/keun_logo.jpg)
===========

**Keun** ([West Flemish](https://en.wikipedia.org/wiki/West_Flemish) for [rabbit](https://anw-ivdnt-org.translate.goog/article/keun?_x_tr_sl=nl&_x_tr_tl=en&_x_tr_hl=nl&_x_tr_pto=wapp)) is a web based modern variant of the [Usagi](https://www.ohdsi.org/web/wiki/doku.php?id=documentation:software:usagi) OMOP [CDM](https://www.ohdsi.org/data-standardization/) mapping tool.

THIS IS ALPHA SOFTWARE

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
- Includes the super fast [svelte-datatable](https://github.com/RADar-AZDelta/svelte-datatable) component. So it can handle very, very lage CSV files. It uses the [Arquero](https://uwdata.github.io/arquero/) library in a web worker.
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

![4-eyes-principal](https://github.com/RADar-AZDelta/Keun/assets/71939691/ccb45c22-a26d-44eb-99e4-66cc58b7c501)

## User manual
### Onboarding
##### Author
When you visit the application for the first time, a pop-up will appear to ask who the current author is. Since this is the first time, it is obliged to fill in an author. When you revisit the page in the future, the previous author is remembered and will be filled in automatically.

This author is needed to fill in who has mapped a row. The author can be edited or changed via the author button in the upper right button.

![change-author](https://github.com/RADar-AZDelta/Keun/assets/71939691/cec0dd30-097e-4f4b-9acb-c169f412aaa2)

##### Settings
When visiting the application for the first time, your preferences have not been set yet. It is advised to open the settings and change some settings to your liking before starting to map concepts. To open the settings pop-up you'll need to click on the settings button in the upper right corner next to the author button.

A pop-up will open with the following options:
- Map to multiple concepts
- Automatic mapping
- Language of source CSV
- Default vocabulary ID for custom concepts
- Font size

### Settings
There are also some settings that can be customised. These settings can be accessed also at the upper right side with a click on the button with a gear. The settings that can be changed are the following:

- Enable mapping to multiple concepts
- Enable automapping
- Language of concepts
- Vocabulary id of custom concepts

##### Enable mapping to multiple concepts
This option enables the user to map a certain concept to multiple standard concepts. In certain cases this will be needed and when mapping to a second concept, a row will be added at the back of the file. When sorting on certain columns, you will be able to see those rows next to eachother.

Not only is there the possibility to map to multiple standard concepts, but also to map to multiple custom concepts. You can even map to standard & custom concepts at the same time.

![enable-multiple-mapping](https://github.com/RADar-AZDelta/Keun/assets/71939691/7f9ac709-a7d8-4ab3-b364-a0caddbdd544)

##### Enable automapping
The option "automapping" is a feature to automate the mapping proces. When enabling this feature, every row of the file will be checked on the sourceName. This sourceName will be translated, if needed depending on the option "Language of concepts", to English and then searched in the Athena library. The first found concept in Athena will then be used to map to.

![enable-automapping](https://github.com/RADar-AZDelta/Keun/assets/71939691/755cf11e-5a6b-4751-9002-92345ec65bd3)

##### Language of source CSV
This option lets the author choose the language that the sourceName is in. When choosing a language other than English, the sourceName will be translated to filter Athena when opening the mapping pop-up. This translated sourceName can also be used for better automapping.

![change-language](https://github.com/RADar-AZDelta/Keun/assets/71939691/e540fddb-24be-46fb-a2dd-ce31a8380844)

##### Default vocabulary ID for custom concepts
When mapping a row to a custom concept, there are a few fields that need to be filled in. These fields are the following:
- domain_id
- vocabulary_id
- concept_class_id
- concept_name

Because the vocabulary_id will probably always be the same, it can be set once in the settings. This value will be filled in automatically when creating a custom concept.

![change-vocab](https://github.com/RADar-AZDelta/Keun/assets/71939691/75f14717-c64d-463b-ba53-630c9900e23f)

##### Font size
The last option is the choice of the font size. This can be handy for people who like to get more information on their screen without scrolling. Only the font size of the table will be changed and not the other components.

![change-font](https://github.com/RADar-AZDelta/Keun/assets/71939691/26d84fb4-ddb6-4689-b31e-7eab453dd762)

### Manual
When doubting how certain things work, the user can look at the manual of POC-Keun. This manual is a copy of this README and can be found when clicking the info button in the upper right corner next to the settings button.

![manual](https://github.com/RADar-AZDelta/Keun/assets/71939691/fb0a8d7a-feeb-4f81-bc0a-9c083c8594a3)

### Inserting a file
When opening the application, the first thing the user will see is a call to upload a CSV-file. This CSV file can be dropped in the given zone or can be uploaded via the button.

When wanting to open a new CSV-file when there is already a file uploaded there is a button to upload a file in the upper section of the page. When clicking this, the file explorer will open and the user can choose a file.

![upload](https://github.com/RADar-AZDelta/Keun/assets/71939691/d4c4dd27-6be6-4119-bbbd-99b084534ad5)

### Downloading a file
When the user is done mapping, the file needs to be downloaded. To download the mapped file, the user needs to press the download button in the upper section of the page, next to the upload button. This will open the file explorer and here the user can save the file.

![download](https://github.com/RADar-AZDelta/Keun/assets/71939691/36df8a8d-392b-47fe-8d14-d9abbed89d9a)

### Downloading custom concepts
When the user maps to custom concepts, he will want to have the custom concepts downloaded. when mapping to custom concepts, a seperate datatable will be made and a button will appear next to the upload & download button on the upper side of the page. When pressing this button the file explorer will open again and the custom concepts can be saved on your device.

![custom-download](https://github.com/RADar-AZDelta/Keun/assets/71939691/7d320a97-0787-4566-93bb-b823477f712a)

### Mapping
To map a row there are the following possibilities:
- Double click a row
- Click the mapping icon (magnifying glass) in the action column of a row

##### Applying filter for Athena
If the user wants to apply filters to find better results in Athena this can be done in the Athena pop-up. When the pop-up is opened, click the left section of the pop-up open. Here are the different kinds of filters that can be applied to Athena.

Choose a certain type of filter and click on it. This will open a place with all the filters for that type. Here the user can search for certain filters or just scroll to find a filter. When a filter has be chosen, click the checkbox and the data from Athena will change to apply the filter.

![apply-filter-athena](https://github.com/RADar-AZDelta/Keun/assets/71939691/39aa90b5-c8a1-4a01-99bc-67b92fb8a23c)

##### Details
There are certain details that can be applied to a row. These details are placed in the right section of the Athena pop-up. Click this section open and here are the following details:
- Equivalence
- Assigned reviewer
- Comment

###### Equivalence
The equivalence of the mapping can be set to one of the following options:
- EQUAL
- EQUIVALENT
- WIDER
- NARROWER
- INEXACT
- UNMATCHED
- UNREVIEWED

When mapping a concept the equivalence value will be changed to the option set.

![equivalence](https://github.com/RADar-AZDelta/Keun/assets/71939691/3a150b11-6bd2-41d1-a1f0-7d4e7841eba2)

###### Assigned reviewer
When the user wants to assign a person to review a certain row this can be done in the details section. The user can type the name of the person here and this will be placed in the selected row. The row does not need to be mapped to apply the value, it will be done either way.

When typing a name. The name will be remembered for reviewers in the future and will be given as suggestion when typing.

GIF ASSIGNED REVIEWER

###### Comment
When the user wants to add a comment to a row this can be done in the details section. There is a textbox to type the comment. This comment will be added to the row automatically without mapping.

![comments](https://github.com/RADar-AZDelta/Keun/assets/71939691/3a45e5f8-6b3d-42b0-bfff-5329905cc9a9)

##### Mapping to Athena concept
When the user finds a concept suitable to the selected row, the user has the following options:
- Map the concept
- Check details of the concept

To map the concept, the user needs to click the "+"-icon on the left side of the table. Depending if the setting "Enable mapping to multiple concepts" is active, the row will be updated or a new row will be added.

![athena-mapping](https://github.com/RADar-AZDelta/Keun/assets/71939691/3e019ba4-e09e-4c70-aec5-ba54fc863814)

To see the details about a concept, the user needs to click the "link"-icon on the left side of the table. Clicking this button, a new tab will open to Athena with details about the concept.

![athena-detail](https://github.com/RADar-AZDelta/Keun/assets/71939691/47019b45-102c-4a05-aed2-e80790a5cdc2)

##### Mapping to custom concept
When the user does not find a suitable concept in Athena, there is the possibility to add a custom concept. To create a custom concept the user needs to select the tab "Custom concept" above the table in the pop-up. Here are 4 input fields and if the user configured the setting "Vocabulary id of custom concepts", the field "vocabulary_id" will already be filled in.

When typing in the fields "domain_id" & "concept_class_id", suggestions will appear. The user needs to select a suggestion because these fields need to be predefined values. If the user does not choose one of those predefined values, an error message will appear.

When the fields are filled in correctly, the user can click the "+"-button on the left side to map the custom concept to the row.

![custom-mapping](https://github.com/RADar-AZDelta/Keun/assets/71939691/e238a13c-aed2-40f7-b615-f58bb3837c6e)

##### See already mapped rows
When the user is mapping rows and wants to see which concepts are already mapped to the selected row he can click on the tab "Mapped concepts" above the table. Here is a table displayed with all the mapped concepts (custom & Athena concepts). The user can delete mapped rows in this place with the "x"-button on the left side of the row.

![athena-mapped-rows](https://github.com/RADar-AZDelta/Keun/assets/71939691/3fb5ccd4-6b5f-4709-8d30-d7b0fedb0754)

##### Navigate rows in pop-up
When the user is done mapping a certain row, he can navigate to the previous or next row with the buttons on the top of the pop-up.

![pop-up-navigate](https://github.com/RADar-AZDelta/Keun/assets/71939691/ba9c42c3-293a-486d-bf97-30fe26982a12)

### Actions
Per row there are actions that the user can apply to the row. These actions can be found on the left side of the row. The available options are the following:
- Mapping
- Erase
- Automap
- Approve
- Flag
- Unapprove

##### Mapping
If the user clicks the magnifying glass icon, a pop-up to map concepts will open. Here the user can map to Athena concepts or custom concepts.

![mapping-action](https://github.com/RADar-AZDelta/Keun/assets/71939691/31d58d97-5e15-49e3-ab44-378d6a67b456)

##### Erase
If the user clicks on the erase button on a row there are two possibilities to happen.
- The row will be deleted
- The filled in values will be deleted (except sourceCode, sourceName & sourceFrequency)

The row will be deleted if the row is mapped to 2 or more concepts.
The values of the row will be deleted when it is the only row (single mapping).

![erase](https://github.com/RADar-AZDelta/Keun/assets/71939691/05ea4871-0f9d-4e31-aed6-8901cc9cdc8b)

##### Automap
If the user wants to automap a certain row, this is possibly with the AUTO-button.

![automap-row](https://github.com/RADar-AZDelta/Keun/assets/71939691/72b8b5ee-3a3d-4c32-917c-c47c82b92564)

##### Mappingstatus
The last 3 actions are to change the mappingstatus of the row. When the user clicks on an action that is already active, this will deactivate the action. This only works with Flag & Unapprove.

![actions](https://github.com/RADar-AZDelta/Keun/assets/71939691/e4dbcd94-e6cf-41d8-9ef0-48218a5c93a8)

###### Approve
If the user approves a row, with the ✔️-button, and he is the first author of the row, then the mappingstatus will be set to "SEMI-APPROVED" because of the 4-eyes principal. When it is the second author and he does not edit the mapping and just approves the mapping, the mappingstatus will change to "APPROVED".

###### Flag
If the user wants to flag a row this is possible with the 🚩-button. This will set the mappingstatus to "FLAGGED".

###### Unapprove
If the user wants to unapprove a row this is possible with the ✖️-button. This will set the mappingstatus to "UNAPPROVED".



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



License
========

Copyright © 2023 [RADar-AZDelta](mailto:radar@azdelta.be).
Released under the [GNU General Public License v3.0](LICENSE).
