import pyautogui as py
import random
import time
import keyboard
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from screeninfo import get_monitors

def openBrowser():
    d = DesiredCapabilities.CHROME
    d['gooog:loggingPrefs'] = { 'browser':'ALL' }
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    driver = webdriver.Chrome(desired_capabilities=d, chrome_options=options)

    driver.get('https://radar-azdelta.github.io/Keun/')
    return driver

def moveAndClick(x: int, y: int, sleep: int):
    py.moveTo(x, y)
    py.click()
    time.sleep(sleep)

def moveClickAndType(x: int, y: int, text: str):
    moveAndClick(x, y, 0)
    py.typewrite(text)
    time.sleep(0.3)

def searchForFile(filePath: str):
    location = py.locateOnScreen(filePath, minSearchTime=2, confidence=0.6)
    locationCenter = py.center(location)
    return {
        'x': locationCenter.x,
        'y': locationCenter.y
    }

def uploadFile():
    # Move to input field and click
    moveClickAndType(981, 578, 'Bob')
    # Click on save
    moveAndClick(1108, 629, 1)
    # Click on upload
    moveAndClick(950, 747, 3)
    # Create your own scenario to find a file and place images of how to get there in the static/testing-images folder
    # In this scenario, the file I need to upload is in the desktop folder
    # Click on desktop folder
    desktopLoc = searchForFile('static/testing-images/folder.png')
    moveAndClick(desktopLoc['x'], desktopLoc['y'], 0)
    # Click on specified file
    fileLoc = searchForFile('static/testing-images/file.png')
    moveAndClick(fileLoc['x'], fileLoc['y'], 0)
    py.doubleClick()


def getCoordinates(ignoreCoordinates: dict):
    width = get_monitors()[0].width
    height = get_monitors()[0].height
    x = random.randrange(0, width)
    y = random.randrange(140, height-80)
    if((x > ignoreCoordinates['x1'] & x < ignoreCoordinates['x2']) & (y > ignoreCoordinates['y1'] & y < ignoreCoordinates['y2'])):
        time.sleep(0.1)
        return
    return {
        'x': x,
        'y': y
    }

try:
    driver = openBrowser()
    f = open('static/log.txt', 'a')
    uploadFile()
    ignoreUploadDownload = False
    ignoreCoordinates = {'x1': 0, 'y1': 0, 'x2': 0, 'y2': 0}
    while True:
        if(ignoreUploadDownload == False):
            time.sleep(1.5)
            uploadLoc = searchForFile('static/testing-images/upload.png')
            downloadLoc = searchForFile('static/testing-images/download.png')
            ignoreCoordinates = {
                'x1': uploadLoc['x'] - 80,
                'y1': uploadLoc['y'] - 50,
                'x2': uploadLoc['x'] + 80,
                'y2': uploadLoc['y'] + 50
            }
            ignoreUploadDownload = True

        coordinates = getCoordinates(ignoreCoordinates)
        if(coordinates != None):
            py.moveTo(coordinates['x'],coordinates['y'])
            py.click()
            py.typewrite('Aller')
            for entry in driver.get_log('browser'):
                if(entry['level'] == "WARNING"):
                    f.write(f"Message: {entry['message']}\nTime: {entry['timestamp']}\n\nLevel: {entry['level']}\n\n----------------------------A----\n\n")
            time.sleep(0.1)

except keyboard.is_pressed('q'):
    f.close()
    print('\nDone.')