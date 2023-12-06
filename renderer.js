const { mouse, screen, FileType, Button, imageResource, Region, straightTo, Point, getWindows, getActiveWindow } = require("@nut-tree/nut-js");
const { Hardware, Virtual, GlobalHotkey } = require("keysender");
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path')
const remote = require('@electron/remote');
const dialog = remote.dialog;
const currentWindow = remote.getCurrentWindow();

const { BrowserWindow, desktopCapturer } = require('electron')

const {
  closest,
} = require("color-diff");
// 120, 87, 169 72, 105, 160
let palette = [
    {R: 155, G: 121, B: 84, value: 5 },
    {R: 120, G: 87, B: 169, value: 4 },
    {R: 72, G: 105, B: 160, value: 3 },
    {R: 65, G: 127, B: 128, value: 2 },
];

let compareHidePalette = [
    {R: 34, G: 37, B: 46, value: 'hide' },
    {R: 255, G: 255, B: 255, value: 'compare' },
]

let selectedLevel = 9
let selectedGrade = 5

const defaultSpeed = 5000;
const slowSpeed = 500;

mouse.config.mouseSpeed = defaultSpeed;
let wind;
let xOffset = 0
let yOffset = 0
let page = 0;
let grade = 5;
let items = [];
let exit = true;

let xCrop = 700

function sleep(ms) {
    console.log('sleep', ms);
    return new Promise(resolve => setTimeout(resolve, ms));
}

setInterval(evalQueue, 10)

let queue = []
async function evalQueue() {
    if (exit) return;
    if (queue.length == 0) return;
    let fn = queue.shift();

    await fn();
}

async function setWindow() {
    if (exit) return;
    wind = new Hardware("Honkai: Star Rail");

    if (wind.workwindow.isOpen()) {
        console.log('Found window');
        await wind.workwindow.setForeground()
        await wind.workwindow.setView({ x: 0, y: 0 }); // move workwindow to top left corner of the screen
        let view = wind.workwindow.getView()
        xOffset = view.x
        yOffset = view.y

        await sleep(1000);

        return true;
    }
    console.log('Did not find window');
    return false;
}

async function scrollDown(n) {
    if (exit) return;
    for (let i = 0; i < n; i++) {
        mouse.scrollDown(1)
    }

    await sleep(500);
};

function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    R: parseInt(result[1], 16),
    G: parseInt(result[2], 16),
    B: parseInt(result[3], 16)
  } : null;
}

let magickPath = 'magick/magick.exe'
let tesseractPath = 'Tesseract-OCR/tesseract.exe'

async function regionCapture2(imageIndex) {
    let date1 = new Date()
    await screen.captureRegion(`screenshot${imageIndex}.png`, new Region(1478+xOffset, 103+yOffset, 415, 470), FileType.PNG, 'resources');
    let date2 = new Date()
}

async function compareCapture() {
    await sleep(500)
    await screen.captureRegion(`screenshotCompare.png`, new Region(1491 + xOffset, 111 + yOffset, 167, 32), FileType.PNG, 'resources');

    let compareHideColor = hexToRgb(await execSync(`\
        "${magickPath}" "resources/screenshotCompare.png" -format "%[hex:u.p{${32},${16}}]" info:
    `).toString().substring(0, 6))

    let compareHide = closest(compareHideColor, compareHidePalette).value
    console.log(compareHideColor, compareHide)
    if (compareHide == 'compare') {
        console.log('Switching background to compare mode')
        log('Switching background to compare mode')
        await clickAt(1575, 128);
        await sleep(500)
    }
}

async function readImageFile(name, num) {
    await execSync(`\
        "${tesseractPath}" "resources/${name}.png" "resources/${name}" -l eng -psm 6 tessconfig${num ? 'num' : ''}.txt \
    `)
    return fs.readFileSync(`resources/${name}.txt`, "utf-8");
}


async function runOcr(imageIndex) {
    try {
        console.log('Run ocr');
        log('\n=== Running OCR ===\n')

        await execSync(
`"${magickPath}" convert \
"./resources/screenshot${imageIndex}.png" \
( +clone -crop 269x237+51+152 -channel RGB -negate -resize 300% -set colorspace Gray  -threshold 50% -normalize -white-threshold 45% -density 300 -units PixelsPerInch  -write  "./resources/croppedStatType${imageIndex}.png" +delete ) \
( +clone -crop 105x239+307+147 -channel RGB -negate -resize 300% -set colorspace Gray  -normalize -white-threshold 45% -density 300 -units PixelsPerInch -write "./resources/croppedStatValue${imageIndex}.png" +delete ) \
( +clone -crop 68x36+345+102 -channel RGB -negate  -fuzz 30   -set colorspace Gray -separate -white-threshold 60% -resize 200% -write "./resources/croppedPartEnhance${imageIndex}.png" +delete ) \
-crop 393x45+3+425 -channel RGB -negate  -fuzz 30   -set colorspace Gray -separate -white-threshold 60% -resize 200% "./resources/croppedSet${imageIndex}.png"
`)

        let ocrStatType = readImageFile(`croppedStatType${imageIndex}`)
        let ocrStatValue = readImageFile(`croppedStatValue${imageIndex}`, true)
        let ocrPartEnhance = readImageFile(`croppedPartEnhance${imageIndex}`)
        let ocrSet = readImageFile(`croppedSet${imageIndex}`)

        let values = await Promise.all([ocrStatType, ocrStatValue, ocrPartEnhance, ocrSet])
        let result = {
            ocrStatType: values[0],
            ocrStatValue: values[1],
            ocrPartEnhance: values[2],
            ocrSet: values[3],
        }

        log('Read: ' + JSON.stringify(result) + '\n')
        console.log('Read: ', result)

        let enhance = parseInt(result.ocrPartEnhance.replace('+', '').trim());
        let stats = result.ocrStatValue.split('\n').map(x => x.trim()).filter(x => x.length > 0).map(x => x.replace(/\s/g, ""));
        let types = result.ocrStatType.split('\n').map(x => x.trim()).filter(x => x.length > 0).map(x => x.replace(/[^a-zA-Z]/g, ""))
        let set = result.ocrSet.trim();

        let mergedStats = []
        for (let i = 0; i < 5; i++) {
            if (stats[i] && types[i]) {
                mergedStats.push(types[i] + " " + stats[i])
            }
        }

        let relic = {
            stats: mergedStats,
            enhance,
            set,
            grade
        }

        log('Parsed: ' + JSON.stringify(relic) + '\n')
        console.log('Parsed: ', relic)

        return relic
    } catch (e) {
        log('Error: \n' + e)
        log('This is most likely an issue with your screen resolution - please set the game resolution to 1920x1080 and exit full screen before trying again.')
        console.error(e)
    }
}

window.runOcr = runOcr

async function save() {
    const options = {
        title: "Save file",
        defaultPath : 'relics.json',
        buttonLabel : "Save file",
        filters :[
            {name: 'JSON', extensions: ['json']},
        ]
    }
    const filename = dialog.showSaveDialogSync(currentWindow, options);
    if (!filename) return;

    let output = {
        fileType: 'Fribbels HSR Scanner',
        fileVersion: 'v1.0.0',
        relics: items,
    }

    console.log(output);

    fs.writeFile(filename, JSON.stringify(output, null, 2), err => {
      if (err) {
        console.error(err);
      }
    });

    setStatus('Saved')
}
window.save = save
async function generateResults() {
    setStatus(`Done, scanned ${items.length} relics, press Save!`)
    const exporterElement = document.getElementById("exporter");
    exporterElement.style.display = "block";
}

async function clickAt(x, y) {
    if (exit) return;
    await moveMouse(x, y);
    await leftClick();
    await sleep(400);
}

async function clickAtPoints(arr) {
    if (exit) return;
    let point = arr.shift();
    await clickAt(point[0], point[1]);

    q(clickAtPoints, arr);
}

async function nextPage(state) {
    if (exit) return;
    if (page >= 5) {
        if (selectedGrade == 4 && grade == 5) {
            console.warn('RESTART!', state)
            page = 0;
            grade = 4;
            await setFilter(4);
            await clickAt(75, 145); // Head

            return scanPageQ({
                index: 1,
                row: 0,
                column: 1,
                rowPrevious: 0,
                rowFirst: 0
            })
        } else {
            return generateResults();
        }
    }
    log('Next page')
    page++;
    if (page == 1) {
        await clickAt(159, 145);
    }
    if (page == 2) {
        await clickAt(256, 145);
    }
    if (page == 3) {
        await clickAt(348, 145);
    }
    if (page == 4) {
        await clickAt(436, 145);
    }
    if (page == 5) {
        await clickAt(524, 145);
    }

    if (grade == 4) {
        scanPageQ({
            index: 1,
            row: 0,
            column: 1,
            rowPrevious: 0,
            rowFirst: 0
        })
    } else {
        scanPageQ();
    }
}

async function scanPageQ(state) {
    try {
        if (exit) return;
        if (!state) {
            state = {
                index: 0,
                row: 0,
                column: 0,
                rowPrevious: 0,
                rowFirst: 0,
            }
        }

        let xCoord = 125 * state.column + 100;
        let yCoord = 150 * state.row + 275;

        await moveMouse(xCoord, yCoord);
        await leftClick();
        await sleep(200);

        log(`Scanning on row ${state.row} col ${state.column}`)
        let id = `${state.row}${state.column}`
        await regionCapture2(id)
        let itemData = await runOcr(id);

        if (itemData.enhance < selectedLevel) return nextPage(state);
        if (itemData.enhance > 12 && grade == 4) return nextPage(state);

        console.warn(state.index, itemData == state.rowPrevious, itemData, state.rowPrevious)
        if (state.index == 0) {
            state.rowFirst = itemData;
            state.rowPrevious = itemData;
        } else {
            if (JSON.stringify(itemData) == JSON.stringify(state.rowFirst) || JSON.stringify(itemData) == JSON.stringify(state.rowPrevious)) {
                return nextPage(state);
            }

            state.rowPrevious = itemData
            if (state.column == 0) {
                state.rowFirst = itemData
            }
        }

        items.push(itemData);

        state.index++;
        if (state.column >= 3) {
            state.column = 0;
            state.row++;
        } else {
            state.column++;
        }


        if (state.row >= 5 && state.column == 0) {
            state.row = 4;
            await scrollDown(state.index % 80 == 0 ? 4 : 5);
        } else {

        }

        q(scanPageQ, state);
    } catch (e) {
        console.error(e)
        GlobalHotkey.deleteAll()
        queue = []
    }
}

function q(fn, ...args) {
    if (exit) return;
    console.log('q', args);
    queue.push(fn.bind(null, ...args));
}

async function setMenu() {
    if (exit) return;
    log('Selecting relic menu')
    await clickAt(184, 437);
    await clickAt(747, 290);
    await clickAt(1575, 128);
}

async function setSort() {
    if (exit) return;
    log('Selecting sort order')
    await clickAt(250, 1000);
    await clickAt(975, 415);
    await clickAt(1186, 757);
    await clickAt(82, 149);
}
async function setFilter(n) {
    if (exit) return;
    log('Selecting grade filter')
    await clickAt(53, 1000); // Filter button
    await clickAt(1475, 1000); // Reset button
    if (n == 4) {
        await clickAt(1443, 404); // Enable 4 star filter
    } else {
        await clickAt(1657, 404); // Enable 5 star filter
    }

    await clickAt(800, 600); // Exit sort menu
}
document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById('saveButton').addEventListener("click", async () => {
        save()
    })
    document.getElementById('startButton').addEventListener("click", async () => {
        try {
            let textarea = document.getElementById('textArea')
            textarea.value = ''
            setStatus("Scan starting in 3 seconds - Press any key to cancel")
            log('Scan initiated')

            exit = false
            await sleep(3000);

            var selectLevelElement = document.getElementById("inputLevel");
            selectedLevel = selectLevelElement.value;
            console.log('Minimum level: ', selectedLevel)
            log('Minimum enhance level: ' + selectedLevel)

            var selectGradeElement = document.getElementById("inputGrade");
            selectedGrade = selectGradeElement.value;
            console.log('Minimum grade: ', selectedGrade)
            log('Minimum grade: ' + selectedGrade)

            page = 0;
            grade = 5;
            queue = []
            items = [];
            let found = await setWindow();

            if (!found) {
                return;
            }

            await setMenu();
            await setSort();
            await setFilter(5);

            await compareCapture()

            q(scanPageQ);
        } catch (e) {
            console.error(e)
            GlobalHotkey.deleteAll()
        }
    });
});

async function moveMouse(x, y) {
    try {
        if (exit) return;
        console.log('Move mouse', x, y);
        await wind.mouse.moveTo(x, y);
    } catch (e) {
        console.error(e)
        log('Error ' + e)
        log('Error ' + e.stack)
    }
}

async function leftClick() {
    if (exit) return;
    console.log('Left click');
    await wind.mouse.click();
}


function setStatus(x) {
    const statusElement = document.getElementById("status");
    statusElement.textContent = "Status: " + x;
}

const ioHook = require('iohook');

let excludedKeycodes = [
    56, // alt
    15, // tab
    // 29, // ctrl
]
ioHook.on('keydown', (event) => {
    if (excludedKeycodes.includes(event.keycode)) return
    cancel()
});
// Debug tool
// ioHook.on('keydown', (event) => {
//     if (event.keycode == 16) {
//         runOcr()
//     }
// });

// Register and start hook
ioHook.start();

function cancel() {
    if (exit) return
    exit = true;
    setStatus("Cancelled, waiting to start")
    log('Key pressed, cancelling scan')
    queue = []
}

function log(x) {
    let textarea = document.getElementById('textArea')
    textarea.value += (textarea.value.length == 0 ? '' : '\n') + x;

    textarea.scrollTop = textarea.scrollHeight;
}
