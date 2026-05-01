// ==UserScript==
// @name         QuestlogT1
// @namespace    http://tampermonkey.net/
// @version      2026-05-01
// @description  try to take over the world!
// @author       mahus
// @match        https://questlog.gg/throne-and-liberty/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM_log
// ==/UserScript==

const loggerName = "QuestlogT1"
const maxGrade = 41;
const ignoredGrades = [];
const stats = ["str", "dex", "int", "per", "con"]

function log(text) {
    console.log(`${loggerName} > ${text}`);
}

async function modifyResponse(response, action) {
    log(`fetch intercepted: ${response.url}`);
    const clone = response.clone();
    let json = await clone.json();

    let modifiedResponseJson = action(json);

    return new Response(JSON.stringify(modifiedResponseJson), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    });
}

function modifyEquipmentItems(json) {
    json.result.data = Object.fromEntries(
        Object.entries(json.result.data).filter(([key, value]) => value.grade <= maxGrade && !ignoredGrades.includes(value.grade))
    );
    return json
}

function modifyRuneSynergies(json) {
    json.result.data = Object.fromEntries(
        Object.entries(json.result.data).filter(([key, value]) => value.grade <= maxGrade && !ignoredGrades.includes(value.grade))
    );

    let data = json.result.data;
    for (let synergyKey in data) {
        stats.forEach(stat => {
            if (data[synergyKey].stats[stat]) {
                data[synergyKey].stats[stat] -= 1;
            }
        });
    }

    return json
}

(function() {
    'use strict';
    log("started");

    const targetWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    const originalFetch = targetWindow.fetch;

    targetWindow.fetch = async (...args) => {
        const response = await originalFetch(...args);

        if (response.ok) {
            switch (true) {
                // remove grades except t1
                case response.url.includes("characterBuilder.getEquipmentItems"):
                    return modifyResponse(response, (json) => modifyEquipmentItems(json));

                // fix rune synregy stats
                case response.url.includes("characterBuilder.getRuneSynergies"):
                    return modifyResponse(response, (json) => modifyRuneSynergies(json));
            }
        }

        return response;
    }
})();
