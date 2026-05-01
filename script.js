// ==UserScript==
// @name         QuestlogT1
// @namespace    http://tampermonkey.net/
// @version      2026-05-01
// @description  try to take over the world!
// @author       You
// @match        https://questlog.gg/throne-and-liberty/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM_log
// ==/UserScript==

const loggerName = "QuestlogT1"
const itemsMaxGrade = 41;
const runesMaxGrade = 41;
const ignoredGrades = [];
const stats = ["str", "dex", "int", "per", "con"]
const maxStats = 49;
let prevStats = 0;

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
        Object.entries(json.result.data).filter(([key, value]) => value.grade <= itemsMaxGrade && !ignoredGrades.includes(value.grade))
    );
    return json
}

function modifyEquipmentRunes(json) {
        json.result.data = Object.fromEntries(
        Object.entries(json.result.data).filter(([key, value]) => value.grade <= runesMaxGrade)
    );
    return json
}

function modifyRuneSynergies(json) {
    json.result.data = Object.fromEntries(
        Object.entries(json.result.data).filter(([key, value]) => value.grade <= runesMaxGrade)
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

function freezeStatsButtons() {
    let statsText = document.querySelector('.flex.h-8.rounded-t.bg-dark.flex-center').textContent;
    let currentStats = parseInt(statsText.match(/\d+/));
    log("stats: " + currentStats)

    if (prevStats != currentStats) {
        const statsContainer = document.querySelector(".flex.flex-col.gap-2.p-2");
        const statsIncrementButtons = statsContainer.querySelectorAll('button.inline-flex.bg-light.text-default');

        statsIncrementButtons.forEach(btn => {
            const isPlus = btn.querySelector('.i-ph\\:plus-bold'); 
            
            if (isPlus && currentStats >= maxStats) {
                btn.style.opacity = '0.2';
                btn.style.cursor = 'pointer';
                btn.disabled = true;
            } else {
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                btn.disabled = false;
            }
        });
    }
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

                case response.url.includes("characterBuilder.getEquipmentRunes"):
                    return modifyResponse(response, (json) => modifyEquipmentRunes(json));

                // fix rune synregy stats
                case response.url.includes("characterBuilder.getRuneSynergies"):
                    return modifyResponse(response, (json) => modifyRuneSynergies(json));
            }
        }

        return response;
    }

    const observer = new MutationObserver(freezeStatsButtons);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
