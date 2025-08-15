# Mindful
Chrome plugin for productivity and efficiently storing bookmarks

## How to install the Chrome extension
1. Download the source code: Either 1) run `git clone` or 2) download the code zip file from Github and extract it.
2. In Chrome, navigate to chrome://extensions/
3. In the top right corner, click to enable "Developer mode."
4. In the top left corner, click on "Load unpacked."
5. Navigate to the `mindful/` directory you just downloaded. As the root folder, select the `dist/` subdirectory and click select.
6. Now, the Mindful Chrome extension is running in your browser. To make it easier to access, you can pin it to your Chrome extensions bar.

## How to compile the React project for development
1. Run `npm install` to install all the packages.
2. Run `npm run build` from the root `mindful` directory.

## How to run the tests
1. To run one-off, run `npm test`
2. To run continually during development, run in watch mode: `npm test -- --watch`

## How to switch between sandbox vs. prod
This is all controlled by whatever file is named `amplify_outputs.json`.
### To work on production:
1. Download a copy of `amplify_outputs.json` from AWS Apps > Deployment and name it `amplify_outputs.prod.json`.
2. Run `cp amplify_outputs.prod.json amplify_outputs.json`

### To work on sandbox
1. Run `npx ampx sandbox` to have `amplify_outputs.json` generated for you.
