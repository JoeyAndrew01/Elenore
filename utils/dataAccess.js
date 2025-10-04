// - Imports 
const path = require("path")
const fs = require("fs")


// - Helpers
const loadJSONFile = (filePath, label) => {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf8"))
        } else {
            console.error(`❌ ${label} file not found at: ${filePath}`)
        }
    } catch (err) {
        console.error(`❌ Failed to read ${label} file:`, err)
    }
    return {}
}


// - Functionality — Loading
exports.loadData = serverId => {
    const basePath = path.join(__dirname, "..", "storage", "guilds", serverId)
    const abbrPath = path.join(basePath, "abbreviations.json")
    const excludesPath = path.join(basePath, "excludes.json")
    const customMsgsPath = path.join(basePath, "cust_msgs.json")
    const warnCountsPath = path.join(basePath, "warn_counts.json")

    const abbreviations = loadJSONFile(abbrPath, "Abbreviations")
    const excludes = loadJSONFile(excludesPath, "Excludes")
    const customMsgs = loadJSONFile(customMsgsPath, "Custom Messages")
    const warnCounts = loadJSONFile(warnCountsPath, "Warn Counts")

    return {
        abbrPath,
        abbreviations,
        excludesPath,
        excludes,
        customMsgsPath,
        customMsgs,
        warnCountsPath,
        warnCounts,
        dmWarning: customMsgs.dmWarning,
        abbrWarning: customMsgs.abbrWarning
    }
}


// - Functionality — Edit Abbreviations
exports.editAbbreviations = async (abbrPath, abbrs, abbrKey, abbrFullForm) => {
    try {
        if (abbrFullForm === "DELETE") {
            delete abbrs[abbrKey.toUpperCase()]
        } else {
            abbrs[abbrKey.toUpperCase()] = abbrFullForm
        }
        await fs.promises.writeFile(abbrPath, JSON.stringify(abbrs, null, 4))
    } catch (err) {
        console.error("❌ Failed to save abbreviations file:", err)
    }
}


// - Functionality — Edit Excludes
exports.editExcludes = async (excludesPath, data) => {
    try {
        await fs.promises.writeFile(excludesPath, JSON.stringify(data, null, 4))
    } catch (err) {
        console.error("❌ Failed to save excludes file:", err)
    }
}


// - Functionality — Edit Custom Messages
exports.editCustomMsgs = async (customMsgsPath, customMsgs) => {
    try {
        await fs.promises.writeFile(customMsgsPath, JSON.stringify(customMsgs, null, 4))
    } catch (err) {
        console.error("❌ Failed to save custom messages file:", err)
    }
}


// - Functionality — Edit Warn Counts
exports.editWarnCounts = async (warnCountsPath, warnCounts, ruleType, value, usernameID) => {
    if (value === "increaseByOne") {
        warnCounts[ruleType][usernameID] = (warnCounts[ruleType][usernameID] || 0) + 1
    } else {
        // : should add a validation here but im lazy
        warnCounts[ruleType][usernameID] = value
    }

    try {
    await fs.promises.writeFile(warnCountsPath, JSON.stringify(warnCounts, null, 4))
    } catch (err) {
        console.error("❌ Failed to save warn counts file:", err)
    }
}