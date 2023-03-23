import iziToast from "izitoast";
var wordSaveToGraph = false;

export default {
    onload: ({ extensionAPI }) => {
        const config = {
            tabTitle: "Definitions",
            settings: [
                {
                    id: "word-rAPI-key",
                    name: "RapidAPI Key",
                    description: "Your API Key for RapidAPI from https://rapidapi.com/dpventures/api/wordsapi",
                    action: { type: "input", placeholder: "Add RapidAPI API key here" },
                },
                {
                    id: "word-saveToGraph",
                    name: "Save definitions to Graph",
                    description: "Turn switch to ON to automatically save definitions to your graph",
                    action: {
                        type: "switch",
                        onChange: (evt) => { setSave(evt); }
                    },
                },
            ]
        };
        extensionAPI.settings.panel.create(config);

        if (extensionAPI.settings.get("word-saveToGraph") == true) { // onload
            wordSaveToGraph = true;
        }

        function setSave(evt) { // onchange
            if (evt.target.checked) {
                wordSaveToGraph = true;
            } else {
                wordSaveToGraph = false;
            }
        }

        extensionAPI.ui.commandPalette.addCommand({
            label: "Get definition for selected word",
            callback: () => {
                const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                var selectedText = '';
                if (window.getSelection) {
                    selectedText = window.getSelection();
                } else if (document.getSelection) {
                    selectedText = document.getSelection();
                } else if (document.selection) {
                    selectedText = document.selection.createRange().text;
                } else return;
                var word = selectedText.toString().trim();
                if (word.length > 0) {
                    return fetchWord(word, uid);
                }
            },
        });

        async function fetchWord(word, uid) {
            var rAPIkey, key;

            breakme: {
                if (!extensionAPI.settings.get("word-rAPI-key")) {
                    key = "API";
                    sendConfigAlert(key);
                    break breakme;
                } else {
                    rAPIkey = extensionAPI.settings.get("word-rAPI-key");
                }

                var myHeaders = new Headers();
                myHeaders.append("X-RapidAPI-Key", rAPIkey);
                myHeaders.append("X-RapidAPI-Host", "wordsapiv1.p.rapidapi.com");

                var requestOptions = {
                    method: 'GET',
                    headers: myHeaders
                };

                var pageUID = await window.roamAlphaAPI.pull("[:block/uid]", [":node/title", "words/definitions/" + word + ""])?.[":block/uid"];
                if (pageUID == undefined) { // create new page or show toast
                    let response = await fetch("https://wordsapiv1.p.rapidapi.com/words/" + word + "", requestOptions);
                    if (response.ok) {
                        let data = await response.json();
                        if (data.hasOwnProperty("results")) {
                            if (wordSaveToGraph == true) { // save word to graph
                                var thisBlock = window.roamAlphaAPI.util.generateUID();
                                await window.roamAlphaAPI.createPage({ page: { title: "words/definitions/" + data.word + "", uid: thisBlock } });
                                pageUID = thisBlock;

                                let q = `[:find (pull ?page [:node/title :block/string :block/uid {:block/children ...} ]) :where [?page :block/uid "${pageUID}"]  ]`;
                                var info = await window.roamAlphaAPI.q(q);

                                var definitionUID;
                                if (info == undefined) {
                                    let newBlockUid = roamAlphaAPI.util.generateUID();
                                    await window.roamAlphaAPI.createBlock({ location: { "parent-uid": pageUID, order: 0 }, block: { string: "__" + data.word + "__", uid: newBlockUid } });
                                    definitionUID = newBlockUid;
                                } else {
                                    if (info[0][0].hasOwnProperty("children")) {
                                        for (var i = 0; i < info[0][0].children.length; i++) {
                                            if (info[0][0].children[i].string == "__" + data.word + "__") {
                                                definitionUID = info[0][0].children[i].uid;
                                            }
                                        }
                                    } else {
                                        definitionUID = roamAlphaAPI.util.generateUID();
                                        await window.roamAlphaAPI.createBlock({ location: { "parent-uid": pageUID, order: 0 }, block: { string: "__" + data.word + "__", uid: definitionUID } });
                                    }
                                }

                                var originalString = await window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uid]);
                                let re = new RegExp(`\\b${word}\\b`, 'gi');
                                let subst = "((" + definitionUID + "))";
                                let replacedString = originalString[":block/string"].replace(re, subst);
                                await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: replacedString, open: true } });

                                let existingItems = await window.roamAlphaAPI.q(`[:find (pull ?page [:node/title :block/string :block/uid {:block/children ...} ]) :where [?page :block/uid "${definitionUID}"] ]`);
                                if (existingItems != null && existingItems.length > 0 && existingItems[0].length > 0 && existingItems[0][0].hasOwnProperty("children")) {
                                    for (var i = 0; i < existingItems[0][0].children.length; i++) {
                                        await window.roamAlphaAPI.deleteBlock({ "block": { "uid": existingItems[0][0].children[i].uid } });
                                    }
                                }
                                await window.roamAlphaAPI.ui.rightSidebar.open();
                                await window.roamAlphaAPI.ui.rightSidebar.addWindow({ window: { type: 'outline', 'block-uid': pageUID } });

                                if (data.results.length > 0) {
                                    for (var i = 0; i < data.results.length; i++) {
                                        let thisNewUID = roamAlphaAPI.util.generateUID();
                                        await window.roamAlphaAPI.createBlock({ location: { "parent-uid": definitionUID, order: i + 1 }, block: { string: "__" + data.results[i].partOfSpeech.toString() + "__", uid: thisNewUID } });
                                        let thisNewUID1 = roamAlphaAPI.util.generateUID();
                                        await window.roamAlphaAPI.createBlock({ location: { "parent-uid": thisNewUID, order: i + 1 }, block: { string: "" + data.results[i].definition.toString() + "", uid: thisNewUID1 } });
                                        if (data.results[i].hasOwnProperty("examples")) {
                                            for (var j = 0; j < data.results[i].examples.length; j++) {
                                                let thisNewUID2 = roamAlphaAPI.util.generateUID();
                                                await window.roamAlphaAPI.createBlock({ location: { "parent-uid": thisNewUID1, order: j + 1 }, block: { string: "" + data.results[i].examples[j].toString() + "", uid: thisNewUID2 } });
                                            }
                                        }
                                    }
                                }
                            } else { // show a toast only
                                if (data.results.length > 0) {
                                    var definitionString = "";
                                    let maxResults = 5;
                                    if (data.results.length < 5) {
                                        maxResults = data.results.length;
                                    }
                                    for (var i = 0; i < maxResults; i++) {
                                        if (i == 0) {
                                            definitionString += "<i>" + data.results[i].partOfSpeech.toString() + "</i>";
                                        } else {
                                            definitionString += "<BR><BR><i>" + data.results[i].partOfSpeech.toString() + "</i>";
                                        }
                                        definitionString += "<BR>" + data.results[i].definition.toString() + ""
                                    }
                                    iziToast.question({
                                        theme: 'light',
                                        color: 'black',
                                        layout: 2,
                                        drag: false,
                                        timeout: false,
                                        close: true,
                                        icon: '',
                                        overlay: true,
                                        displayMode: 2,
                                        id: "question",
                                        title: word,
                                        message: definitionString+"<BR><BR>",
                                        position: "center",
                                        buttons: [
                                            [
                                                "<button>Save to Graph</button>",
                                                async function (instance, toast, button, e, inputs) {
                                                    var pageUID = window.roamAlphaAPI.util.generateUID();
                                                    await window.roamAlphaAPI.createPage({ page: { title: "words/definitions/" + data.word + "", uid: pageUID } });
                                                    let definitionUID = roamAlphaAPI.util.generateUID();
                                                    await window.roamAlphaAPI.createBlock({ location: { "parent-uid": pageUID, order: 0 }, block: { string: "__" + data.word + "__", uid: definitionUID } });
            
                                                    if (data.results.length > 0) {
                                                        for (var i = 0; i < data.results.length; i++) {
                                                            let thisNewUID = roamAlphaAPI.util.generateUID();
                                                            await window.roamAlphaAPI.createBlock({ location: { "parent-uid": definitionUID, order: i + 1 }, block: { string: "__" + data.results[i].partOfSpeech.toString() + "__", uid: thisNewUID } });
                                                            let thisNewUID1 = roamAlphaAPI.util.generateUID();
                                                            await window.roamAlphaAPI.createBlock({ location: { "parent-uid": thisNewUID, order: i + 1 }, block: { string: "" + data.results[i].definition.toString() + "", uid: thisNewUID1 } });
                                                            if (data.results[i].hasOwnProperty("examples")) {
                                                                for (var j = 0; j < data.results[i].examples.length; j++) {
                                                                    let thisNewUID2 = roamAlphaAPI.util.generateUID();
                                                                    await window.roamAlphaAPI.createBlock({ location: { "parent-uid": thisNewUID1, order: j + 1 }, block: { string: "" + data.results[i].examples[j].toString() + "", uid: thisNewUID2 } });
                                                                }
                                                            }
                                                        }
                                                    }
                                                    await window.roamAlphaAPI.ui.rightSidebar.open();
                                                    await window.roamAlphaAPI.ui.rightSidebar.addWindow({ window: { type: 'outline', 'block-uid': pageUID } });
                                                    
                                                    var originalString = await window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uid]);
                                                    
                                                    let re = new RegExp(`\\b${word}\\b`, 'gi');
                                                    let subst = "((" + definitionUID + "))";
                                                    let replacedString = originalString[":block/string"].replace(re, subst);
                                                    await window.roamAlphaAPI.updateBlock({ block: { uid: uid, string: replacedString, open: true } });
                                                    instance.hide({ transitionOut: "fadeOut" }, toast, "button");
                                                },
                                                false,
                                            ],
                                            [
                                                "<button>Close</button>",
                                                async function (instance, toast, button, e, inputs) {
                                                    instance.hide({ transitionOut: "fadeOut" }, toast, "button");
                                                },
                                                false,
                                            ],
                                        ],
                                        onClosing: function (instance, toast, closedBy) { },
                                        onClosed: function (instance, toast, closedBy) { },
                                    });
                                }
                            }
                        } else {
                            iziToast.show({
                                theme: 'dark',
                                message: 'There are no definitions available for this word!',
                                position: 'center',
                                close: false,
                                timeout: 5000,
                                closeOnClick: true,
                                displayMode: 2
                            });
                        }
                    } else {
                        console.error(response);
                    }
                } else { // open existing page in sidebar
                    await window.roamAlphaAPI.ui.rightSidebar.open();
                    await window.roamAlphaAPI.ui.rightSidebar.addWindow({ window: { type: 'outline', 'block-uid': pageUID } });
                }

            }
        }
    },
    onunload: () => {
        // nothing left here
    }
}

function sendConfigAlert(key) {
    if (key == "API") {
        alert("Please set your RapidAPI Key in the configuration settings via the Roam Depot tab.");
    }
}