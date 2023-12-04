const { mouse, screen, FileType, Button, imageResource, Region, straightTo, Point, getWindows, getActiveWindow } = require("@nut-tree/nut-js");
const { Hardware, Virtual, GlobalHotkey } = require("keysender");
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path')
const remote = require('@electron/remote');
const dialog = remote.dialog;
const currentWindow = remote.getCurrentWindow();
var Jimp = require("jimp");

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

let selectedValue = 9

const defaultSpeed = 5000;
const slowSpeed = 500;

mouse.config.mouseSpeed = defaultSpeed;
let wind;
let xOffset = 0
let yOffset = 0
let page = 0;
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

async function regionCapture() {
  let date1 = new Date()
  var regionImage = await screen.captureRegion('screenshot.png', new Region(xCrop + xOffset, 0 + yOffset, 1920-xCrop, 1080), FileType.PNG, 'resources');
  var regionImage = await screen.captureRegion('cropped0.png', new Region(xCrop + xOffset + 829, 0 + yOffset + 269, 260, 220), FileType.PNG, 'resources');
  var regionImage = await screen.captureRegion('cropped1.png', new Region(xCrop + xOffset + 1082, 0 + yOffset + 265, 110, 220), FileType.PNG, 'resources');
  var regionImage = await screen.captureRegion('cropped2.png', new Region(xCrop + xOffset + 777, 0 + yOffset + 207, 430, 40), FileType.PNG, 'resources');
  var regionImage = await screen.captureRegion('cropped3.png', new Region(xCrop + xOffset + 777, 0 + yOffset + 532, 400, 37), FileType.PNG, 'resources');
  let date2 = new Date()

        // let stdout = await execSync(`\
        //     "${magickPath}" convert "./resources/screenshot.png" -crop 260x220+${1535-xCrop-xOffset}+${310-yOffset} -channel RGB -negate -resize 300%  -set colorspace Gray  -threshold 50% -normalize -white-threshold 45% -density 300 -units PixelsPerInch "./resources/cropped0.png" && \
        //     "${magickPath}" convert "./resources/screenshot.png" -crop 90x220+${1800-xCrop-xOffset}+${310-yOffset}  -channel RGB -negate -resize 300%  -set colorspace Gray  -normalize -white-threshold 45% -density 300 -units PixelsPerInch "./resources/cropped1.png" && \
        //     "${magickPath}" convert "./resources/screenshot.png" -crop 430x40+${1490-xCrop-xOffset}+${240-yOffset}  -channel RGB -negate  -fuzz 30   -set colorspace Gray -separate -white-threshold 60% -resize 200% "./resources/cropped2.png" && \
        //     "${magickPath}" convert "./resources/screenshot.png" -crop 400x37+${1480-xCrop-xOffset}+${560-yOffset}  -channel RGB -negate  -fuzz 30   -set colorspace Gray -separate -white-threshold 60% -resize 200% "./resources/cropped3.png" \
        // `);
  console.log('DIFF', date2-date1)

};

async function scrollDown() {
    if (exit) return;
    await mouse.move(straightTo(new Point(478, 861)));

    await mouse.pressButton(Button.LEFT);

    mouse.config.mouseSpeed = 100;
    await mouse.move(straightTo(new Point(478, 707)));
    mouse.config.mouseSpeed = defaultSpeed;

    await sleep(1000);
    await mouse.releaseButton(Button.LEFT);
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

async function runOcr() {
    try {
        console.log('Run ocr');
        log('\n=== Running OCR ===\n')
        await regionCapture();

        let stdout = await execSync(`\
            "${magickPath}" convert "./resources/cropped0.png" -channel RGB -negate -resize 300%  -set colorspace Gray  -threshold 50% -normalize -white-threshold 45% -density 300 -units PixelsPerInch "./resources/cropped0.png" && \
            "${magickPath}" convert "./resources/cropped1.png" -channel RGB -negate -resize 300%  -set colorspace Gray  -normalize -white-threshold 45% -density 300 -units PixelsPerInch "./resources/cropped1.png" && \
            "${magickPath}" convert "./resources/cropped2.png" -channel RGB -negate  -fuzz 30   -set colorspace Gray -separate -white-threshold 60% -resize 200% "./resources/cropped2.png" && \
            "${magickPath}" convert "./resources/cropped3.png" -channel RGB -negate  -fuzz 30   -set colorspace Gray -separate -white-threshold 60% -resize 200% "./resources/cropped3.png" \
        `);

        let compareHideColor = hexToRgb(await execSync(`\
            "${magickPath}" "resources/screenshot.png" -format "%[hex:u.p{${1530-xCrop-xOffset},${157-yOffset}}]" info:
        `).toString().substring(0, 6))
        let compareHide = closest(compareHideColor, compareHidePalette).value
        if (compareHide == 'compare') {
            console.log('Switching background to compare mode, restarting scan')
            log('Switching background to compare mode, restarting scan')
            await clickAt(1575, 128);
            return await runOcr()
        }

        let color = hexToRgb(await execSync(`\
            "${magickPath}" "resources/screenshot.png" -format "%[hex:u.p{${930-xCrop-xOffset},${785-yOffset}}]" info:
        `).toString().substring(0, 6))
        let grade = closest(color, palette).value

        let typesOcr = await execSync(`\
            "${tesseractPath}" "resources/cropped0.png" "resources/cropped0" -l eng -psm 6 tessconfig.txt \
        `)
        typesOcr = fs.readFileSync("resources/cropped0.txt", "utf-8");

        let statsOcr = await execSync(`\
            "${tesseractPath}" "resources/cropped1.png" "resources/cropped1" -l eng -psm 6 tessconfignum.txt \
        `)
        statsOcr = fs.readFileSync("resources/cropped1.txt", "utf-8");

        let headerOcr = await execSync(`\
            "${tesseractPath}" "resources/cropped2.png" "resources/cropped2" -l eng -psm 6 tessconfig.txt \
        `)
        headerOcr = fs.readFileSync("resources/cropped2.txt", "utf-8");

        let setOcr = await execSync(`\
            "${tesseractPath}" "resources/cropped3.png" "resources/cropped3" -l eng -psm 6 tessconfig.txt \
        `)
        setOcr = fs.readFileSync("resources/cropped3.txt", "utf-8");


        log('Reading types: \n' + typesOcr)
        log('Reading stats: \n' + statsOcr)
        log('Reading header: \n' + headerOcr)
        log('Reading set: \n' + setOcr)
        console.log(typesOcr);
        console.log(statsOcr);
        let headerSplit = headerOcr.split(/\s*\+\s*/);
        let stats = statsOcr.split('\n').map(x => x.trim()).filter(x => x.length > 0).map(x => x.replace(/\s/g, ""));
        let types = typesOcr.split('\n').map(x => x.trim()).filter(x => x.length > 0).map(x => x.replace(/[^a-zA-Z]/g, ""))
        let part = headerSplit[0].trim();
        let enhance = parseInt(headerSplit[1].trim());
        let set = setOcr.trim();

        let mergedStats = []
        for (let i = 0; i < 5; i++) {
            if (stats[i] && types[i]) {
                mergedStats.push(types[i] + " " + stats[i])
            }
        }

        let item = {
            stats: mergedStats, part, enhance, set, grade
        }

        console.log('item', item);
        log('Parsed relic: \n' + JSON.stringify(item, null, 2))
        return item;
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
    setStatus(`Done, scanned ${items.length} relics`)
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

async function nextPage() {
    if (exit) return;
    if (page >= 5) {
        return generateResults();
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
    scanPageQ();
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
                rowFirst: 0
            }
        }

        let xCoord = 125 * state.column + 100;
        let yCoord = 150 * state.row + 275;

        await moveMouse(xCoord, yCoord);
        await leftClick();
        await sleep(200);


        log(`Scanning on row ${state.row} col ${state.column}`)
        let itemData = await runOcr();

        if (itemData.enhance < selectedValue) return nextPage(state);

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
            await scrollDown();
        } else {

        }

        q(scanPageQ, state);
    } catch (e) {
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

            var selectElement = document.getElementById("inputLevel");
            selectedValue = selectElement.value;
            console.log('Minimum level: ', selectedValue)
            log('Minimum enhance level: ' + selectedValue)

            page = 0;
            queue = []
            items = [];
            let found = await setWindow();

            if (!found) {
                return;
            }

            await setMenu();
            await setSort();

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
