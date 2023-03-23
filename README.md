If you sometimes need to check the meaning of a word in your graph, this extension will allow you to do it.

**NEW:**
- compatible with Roam Research Command Palette and Hotkeys

First, set a Hotkey using the Roam Research Settings menu. Then, simply select a word by double-clicking or shift-dragging over it. Then, use your Hotkey to retrieve the definitions.

![definitions](https://user-images.githubusercontent.com/6857790/209282317-890554a7-a8f7-460e-99d0-085c14cbe9e0.gif)

If you already have a saved definition, it will be opened in the right sidebar.

Otherwise, you have two options:
1. the definitions will appear in a toast and you can select to save them to your graph for later reference
2. you can set the 'Save definitions to Graph' option in Roam Depot settings to automatically save new definitions

If you opt to automatically save definitions, the extension will get the definition(s) available and create a words/definitions/_word_ page for you, then open it in the right sidebar. The original word will become a blockref to the word definition so you can easily check it again later if you're prone to forget.

You need an API key from https://rapidapi.com/dpventures/api/wordsapi to make this extension work. You can make up to 2500 requests each day on the free tier, so you will be unlikely to require a paid account.

**TODO:**
- handle synonyms
- config settings for number of definitions to include, inclusion of examples, synonyms etc
