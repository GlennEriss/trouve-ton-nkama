"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs/promises");
var path = require("path");
var dotenv = require("dotenv");
var yaml = require("js-yaml");
var axios_1 = require("axios");
var facebook_pages_1 = require("./facebook-pages");
// Chargement des variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '.env') });
var AXESSO_API_URL = 'http://api.axesso.de/fba/v2/facebook-lookup-posts';
var PRIMARY_KEY = process.env.PRIMARY_KEY;
var SECONDARY_KEY = process.env.SECONDARY_KEY;
var AXESSO_YAML_PATH = path.resolve(__dirname, 'axesso.yaml');
var CURSORS_PATH = path.resolve(__dirname, 'cursors.json');
var API_USAGE_PATH = path.resolve(__dirname, 'api-usage.json');
var PROPERTY_PATH = path.resolve(__dirname, 'property.json');
// Chargement de la configuration YAML
function loadYamlConfig() {
    return __awaiter(this, void 0, void 0, function () {
        var yamlContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.readFile(AXESSO_YAML_PATH, 'utf-8')];
                case 1:
                    yamlContent = _a.sent();
                    return [2 /*return*/, yaml.load(yamlContent)];
            }
        });
    });
}
// Chargement ou initialisation d'un fichier JSON
function loadJsonFile(filePath, defaultValue) {
    return __awaiter(this, void 0, void 0, function () {
        var content, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs.readFile(filePath, 'utf-8')];
                case 1:
                    content = _b.sent();
                    return [2 /*return*/, JSON.parse(content)];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, defaultValue];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// Sauvegarde d'un fichier JSON
function saveJsonFile(filePath, data) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// Vérification des quotas d'appels API
function checkApiQuota(apiUsage, limit, windowMs) {
    var now = Date.now();
    var recent = apiUsage.filter(function (ts) { return now - ts < windowMs; });
    return recent.length < limit;
}
// Ajout d'un timestamp d'appel API
function addApiUsage(apiUsage) {
    return __spreadArray(__spreadArray([], apiUsage, true), [Date.now()], false);
}
// Fonction principale
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var config, startTime, postsParPage, cursors, apiUsage, properties, apiUsageUpdated, propertiesUpdated, cursorsUpdated, _i, facebookPages_1, pageId, usageLastMinute, usageLastMonth, cursor, hasNext, firstCursor, lastCursor, params, epoch, url, response, data, err_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, loadYamlConfig()];
                case 1:
                    config = _d.sent();
                    startTime = config.start_time;
                    postsParPage = config.posts_par_page;
                    return [4 /*yield*/, loadJsonFile(CURSORS_PATH, {})];
                case 2:
                    cursors = _d.sent();
                    return [4 /*yield*/, loadJsonFile(API_USAGE_PATH, [])];
                case 3:
                    apiUsage = _d.sent();
                    return [4 /*yield*/, loadJsonFile(PROPERTY_PATH, [])];
                case 4:
                    properties = _d.sent();
                    apiUsageUpdated = __spreadArray([], apiUsage, true);
                    propertiesUpdated = __spreadArray([], properties, true);
                    cursorsUpdated = __assign({}, cursors);
                    console.log('PRIMARY_KEY chargé (début masqué):', PRIMARY_KEY ? PRIMARY_KEY.slice(0, 6) + '...' : 'NON DÉFINI');
                    _i = 0, facebookPages_1 = facebook_pages_1.default;
                    _d.label = 5;
                case 5:
                    if (!(_i < facebookPages_1.length)) return [3 /*break*/, 20];
                    pageId = facebookPages_1[_i];
                    usageLastMinute = apiUsageUpdated.filter(function (ts) { return Date.now() - ts < 60 * 1000; });
                    usageLastMonth = apiUsageUpdated.filter(function (ts) { return Date.now() - ts < 31 * 24 * 60 * 60 * 1000; });
                    if (!(usageLastMinute.length >= config.appel_api_par_min)) return [3 /*break*/, 7];
                    console.log('Limite d\'appels API par minute atteinte, pause de 60s...');
                    return [4 /*yield*/, new Promise(function (res) { return setTimeout(res, 60 * 1000); })];
                case 6:
                    _d.sent();
                    _d.label = 7;
                case 7:
                    if (usageLastMonth.length >= config.requete_par_mois) {
                        console.log('Limite d\'appels API par mois atteinte, arrêt du script.');
                        return [3 /*break*/, 20];
                    }
                    cursor = (_a = cursorsUpdated[pageId]) === null || _a === void 0 ? void 0 : _a.lastCursor;
                    hasNext = true;
                    firstCursor = undefined;
                    lastCursor = undefined;
                    _d.label = 8;
                case 8:
                    if (!hasNext) return [3 /*break*/, 15];
                    params = { pageId: pageId };
                    if (startTime) {
                        epoch = Math.floor(new Date(startTime).getTime() / 1000);
                        params.startTime = String(epoch);
                    }
                    if (postsParPage)
                        params.limit = String(postsParPage);
                    if (cursor)
                        params.cursor = cursor;
                    url = AXESSO_API_URL + '?' + new URLSearchParams(params).toString();
                    _d.label = 9;
                case 9:
                    _d.trys.push([9, 13, , 14]);
                    return [4 /*yield*/, axios_1.default.get(url, {
                            headers: {
                                'cache-control': 'no-cache',
                                'axesso-api-key': PRIMARY_KEY,
                                'x-api-key': PRIMARY_KEY,
                            },
                        })];
                case 10:
                    response = _d.sent();
                    apiUsageUpdated = addApiUsage(apiUsageUpdated);
                    data = response.data;
                    if (Array.isArray(data.posts)) {
                        propertiesUpdated.push.apply(propertiesUpdated, data.posts);
                    }
                    // Gestion des curseurs
                    if (!firstCursor && data.firstCursor)
                        firstCursor = data.firstCursor;
                    if (data.lastCursor)
                        lastCursor = data.lastCursor;
                    if (data.nextCursor) {
                        cursor = data.nextCursor;
                    }
                    else {
                        hasNext = false;
                    }
                    if (!!checkApiQuota(apiUsageUpdated, config.appel_api_par_min, 60 * 1000)) return [3 /*break*/, 12];
                    console.log('Quota minute atteint, pause de 60s...');
                    return [4 /*yield*/, new Promise(function (res) { return setTimeout(res, 60 * 1000); })];
                case 11:
                    _d.sent();
                    _d.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    err_1 = _d.sent();
                    console.error("Erreur lors du fetch pour la page ".concat(pageId, " :"), err_1.message);
                    hasNext = false;
                    return [3 /*break*/, 14];
                case 14: return [3 /*break*/, 8];
                case 15:
                    // Mise à jour des curseurs pour la page
                    cursorsUpdated[pageId] = {
                        firstCursor: firstCursor || ((_b = cursorsUpdated[pageId]) === null || _b === void 0 ? void 0 : _b.firstCursor),
                        lastCursor: lastCursor || ((_c = cursorsUpdated[pageId]) === null || _c === void 0 ? void 0 : _c.lastCursor),
                    };
                    // Sauvegarde intermédiaire
                    return [4 /*yield*/, saveJsonFile(CURSORS_PATH, cursorsUpdated)];
                case 16:
                    // Sauvegarde intermédiaire
                    _d.sent();
                    return [4 /*yield*/, saveJsonFile(PROPERTY_PATH, propertiesUpdated)];
                case 17:
                    _d.sent();
                    return [4 /*yield*/, saveJsonFile(API_USAGE_PATH, apiUsageUpdated)];
                case 18:
                    _d.sent();
                    _d.label = 19;
                case 19:
                    _i++;
                    return [3 /*break*/, 5];
                case 20: 
                // Sauvegarde finale
                return [4 /*yield*/, saveJsonFile(CURSORS_PATH, cursorsUpdated)];
                case 21:
                    // Sauvegarde finale
                    _d.sent();
                    return [4 /*yield*/, saveJsonFile(PROPERTY_PATH, propertiesUpdated)];
                case 22:
                    _d.sent();
                    return [4 /*yield*/, saveJsonFile(API_USAGE_PATH, apiUsageUpdated)];
                case 23:
                    _d.sent();
                    console.log('Script terminé.');
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (err) {
    console.error('Erreur fatale :', err);
    process.exit(1);
});
