const fs = require('fs');

const lockFilePath = 'package-lock.json';
const packageFilePath = 'package.json';
const placeholderVersion = 'x.x.x';
const command = process.argv[2];

function readJson(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8').toString());
}

function writeJson(path, value, spaces) {
    fs.writeFileSync(path, `${JSON.stringify(value, null, spaces)}\n`);
}

function getLockFile() {
    if (!fs.existsSync(lockFilePath)) {
        return null;
    }

    return readJson(lockFilePath);
}

function writeVersions(version) {
    const pkg = readJson(packageFilePath);
    pkg.version = version;
    writeJson(packageFilePath, pkg, 2);

    const lock = getLockFile();

    if (lock) {
        lock.version = version;

        if (lock.packages?.['']) {
            lock.packages[''].version = version;
        }

        writeJson(lockFilePath, lock, 4);
    }
}

function checkPlaceholder() {
    const pkg = readJson(packageFilePath);
    const lock = getLockFile();
    const errors = [];

    if (pkg.version !== placeholderVersion) {
        errors.push(`package.json version must be "${placeholderVersion}", got "${pkg.version}"`);
    }

    if (lock && lock.version !== placeholderVersion) {
        errors.push(`package-lock.json version must be "${placeholderVersion}", got "${lock.version}"`);
    }

    if (lock?.packages?.[''] && lock.packages[''].version !== placeholderVersion) {
        errors.push(
            `package-lock.json packages[""] version must be "${placeholderVersion}", got "${lock.packages[''].version}"`,
        );
    }

    if (errors.length > 0) {
        for (const error of errors) {
            console.error(error);
        }
        process.exit(1);
    }

    console.log(`Version placeholder validated: ${placeholderVersion}`);
}

function fixPlaceholder() {
    writeVersions(placeholderVersion);
    console.log(`Version placeholder set to: ${placeholderVersion}`);
}

function getCiVersion() {
    const major = process.env.VERSION_MAJOR;
    const minor = process.env.VERSION_MINOR;
    const patch = process.env.VERSION_PATCH;
    const segments = { major, minor, patch };

    for (const [name, value] of Object.entries(segments)) {
        if (!/^\d+$/.test(value ?? '')) {
            console.error(`Missing or invalid ${name} version segment: "${value ?? ''}"`);
            process.exit(1);
        }
    }

    return `${major}.${minor}.${patch}`;
}

if (command === 'check-placeholder') {
    checkPlaceholder();
} else if (command === 'fix-placeholder') {
    fixPlaceholder();
} else if (command === 'set-ci-version') {
    const ciVersion = getCiVersion();
    writeVersions(ciVersion);
    console.log(`CI version set to: ${ciVersion}`);
} else {
    console.error('Invalid command. Use one of: check-placeholder, fix-placeholder, set-ci-version');
    process.exit(1);
}
