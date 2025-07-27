"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyManager = void 0;
var fs = require("fs/promises");
var config_loader_1 = require("../config/config-loader");
var KeyManager = /** @class */ (function () {
    function KeyManager() {
        this.currentKeyIndex = 0;
        this.keysExhausted = new Set();
        this.keyUsageStats = {};
        this.requestCounters = [];
        this.keyStartTimes = {};
        this.apiKeys = [];
        this.rateLimitPerKey = 50;
        // L'initialisation se fera après le chargement de la config
    }
    KeyManager.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, config_loader_1.configLoader.loadConfig()];
                    case 1:
                        config = _a.sent();
                        this.apiKeys = config.api.keys;
                        this.rateLimitPerKey = config.limits.rate_limit_per_key;
                        this.requestCounters = new Array(this.apiKeys.length).fill(0);
                        this.initializeKeyStats();
                        // Vérifier si les clés sont épuisées au démarrage
                        return [4 /*yield*/, this.checkAndResetDailyLimits()];
                    case 2:
                        // Vérifier si les clés sont épuisées au démarrage
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    KeyManager.prototype.initializeKeyStats = function () {
        var _this = this;
        this.apiKeys.forEach(function (key, index) {
            if (!_this.keyUsageStats[index]) {
                _this.keyUsageStats[index] = {
                    keyIndex: index + 1,
                    keyId: key.substring(0, 20) + "...",
                    dateFirstUsed: null,
                    dateLastUsed: null,
                    totalRequests: 0,
                    sessionsHistory: []
                };
            }
        });
    };
    KeyManager.prototype.loadKeyStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, statsFile, content, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, config_loader_1.configLoader.loadConfig()];
                    case 1:
                        config = _a.sent();
                        statsFile = config.files.stats;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fs.readFile(statsFile, 'utf-8')];
                    case 3:
                        content = _a.sent();
                        this.keyUsageStats = JSON.parse(content);
                        console.log('📈 Statistiques des clés chargées depuis le fichier existant');
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        console.log('⚠️ Erreur lors du chargement des stats, initialisation de nouvelles stats');
                        this.initializeKeyStats();
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    KeyManager.prototype.saveKeyStats = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, statsFile;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, config_loader_1.configLoader.loadConfig()];
                    case 1:
                        config = _a.sent();
                        statsFile = config.files.stats;
                        return [4 /*yield*/, fs.writeFile(statsFile, JSON.stringify(this.keyUsageStats, null, 2), 'utf-8')];
                    case 2:
                        _a.sent();
                        console.log("\uD83D\uDCCA Statistiques des cl\u00E9s sauvegard\u00E9es dans ".concat(statsFile));
                        return [2 /*return*/];
                }
            });
        });
    };
    KeyManager.prototype.getCurrentApiKey = function () {
        return this.apiKeys[this.currentKeyIndex];
    };
    KeyManager.prototype.getCurrentKeyIndex = function () {
        return this.currentKeyIndex;
    };
    KeyManager.prototype.incrementRequestCounter = function () {
        this.requestCounters[this.currentKeyIndex]++;
        if (this.requestCounters[this.currentKeyIndex] === 1) {
            this.startKeyUsage(this.currentKeyIndex);
        }
    };
    KeyManager.prototype.startKeyUsage = function (keyIndex) {
        var now = new Date().toISOString();
        this.keyStartTimes[keyIndex] = now;
        if (!this.keyUsageStats[keyIndex].dateFirstUsed) {
            this.keyUsageStats[keyIndex].dateFirstUsed = now;
        }
        this.keyUsageStats[keyIndex].dateLastUsed = now;
    };
    KeyManager.prototype.endKeyUsage = function (keyIndex, reason) {
        if (reason === void 0) { reason = 'Rate limit reached'; }
        var endTime = new Date().toISOString();
        var startTime = this.keyStartTimes[keyIndex];
        var requestCount = this.requestCounters[keyIndex];
        var session = {
            sessionStart: startTime,
            sessionEnd: endTime,
            requestsInSession: requestCount,
            reason: reason,
            date: new Date().toLocaleDateString('fr-FR'),
            time: new Date().toLocaleTimeString('fr-FR')
        };
        this.keyUsageStats[keyIndex].totalRequests += requestCount;
        this.keyUsageStats[keyIndex].sessionsHistory.push(session);
        this.keyUsageStats[keyIndex].dateLastUsed = endTime;
        console.log("\uD83D\uDCDD Cl\u00E9 ".concat(keyIndex + 1, " \u00E9puis\u00E9e - ").concat(requestCount, " requ\u00EAtes effectu\u00E9es"));
        this.saveKeyStats();
        this.requestCounters[keyIndex] = 0;
    };
    KeyManager.prototype.switchToNextKey = function () {
        var _a, _b, _c;
        var previousIndex = this.currentKeyIndex;
        // Ne marquer comme épuisée que si la limite est vraiment atteinte
        var todayRequests = ((_c = (_b = (_a = this.keyUsageStats[previousIndex]) === null || _a === void 0 ? void 0 : _a.sessionsHistory) === null || _b === void 0 ? void 0 : _b.filter(function (session) { return session.date === new Date().toLocaleDateString('fr-FR'); })) === null || _c === void 0 ? void 0 : _c.reduce(function (total, session) { return total + session.requestsInSession; }, 0)) || 0;
        if (todayRequests >= this.rateLimitPerKey) {
            this.endKeyUsage(previousIndex, 'Rate limit reached');
            this.keysExhausted.add(this.currentKeyIndex);
            console.log("\u26A0\uFE0F Cl\u00E9 ".concat(previousIndex + 1, " \u00E9puis\u00E9e (").concat(todayRequests, "/").concat(this.rateLimitPerKey, ")"));
        }
        else {
            console.log("\u26A0\uFE0F Cl\u00E9 ".concat(previousIndex + 1, " temporairement indisponible, basculement..."));
        }
        for (var i = 0; i < this.apiKeys.length; i++) {
            var nextIndex = (this.currentKeyIndex + 1 + i) % this.apiKeys.length;
            if (!this.keysExhausted.has(nextIndex)) {
                this.currentKeyIndex = nextIndex;
                console.log("\uD83D\uDD04 Basculement de la cl\u00E9 ".concat(previousIndex + 1, " vers la cl\u00E9 ").concat(this.currentKeyIndex + 1));
                return true;
            }
        }
        console.log("⚠️ Toutes les clés API ont atteint leur limite quotidienne");
        return false;
    };
    KeyManager.prototype.resetKeyStatus = function () {
        this.keysExhausted.clear();
        this.currentKeyIndex = 0;
        this.requestCounters.fill(0);
        this.keyStartTimes = {};
        console.log('🔄 Statut des clés réinitialisé');
    };
    KeyManager.prototype.getKeyStatus = function () {
        var _this = this;
        console.log('\n📊 Statut des clés API:');
        this.apiKeys.forEach(function (key, index) {
            var _a, _b, _c, _d;
            var status = _this.keysExhausted.has(index) ? '❌ Épuisée' : '✅ Active';
            var current = index === _this.currentKeyIndex ? ' (ACTUELLE)' : '';
            var todayRequests = ((_c = (_b = (_a = _this.keyUsageStats[index]) === null || _a === void 0 ? void 0 : _a.sessionsHistory) === null || _b === void 0 ? void 0 : _b.filter(function (session) { return session.date === new Date().toLocaleDateString('fr-FR'); })) === null || _c === void 0 ? void 0 : _c.reduce(function (total, session) { return total + session.requestsInSession; }, 0)) || 0;
            var totalRequests = ((_d = _this.keyUsageStats[index]) === null || _d === void 0 ? void 0 : _d.totalRequests) || 0;
            console.log("  Cl\u00E9 ".concat(index + 1, ": ").concat(status).concat(current, " - Aujourd'hui: ").concat(todayRequests, "/").concat(_this.rateLimitPerKey, " - Total: ").concat(totalRequests, " req"));
        });
        console.log("\nCl\u00E9s restantes: ".concat(this.apiKeys.length - this.keysExhausted.size, "/").concat(this.apiKeys.length, "\n"));
    };
    KeyManager.prototype.getDetailedKeyStats = function () {
        console.log('\n📈 Statistiques détaillées des clés:');
        Object.values(this.keyUsageStats).forEach(function (stats) {
            console.log("\n\uD83D\uDD11 Cl\u00E9 ".concat(stats.keyIndex, " (").concat(stats.keyId, "):"));
            console.log("  \uD83D\uDCC5 Premi\u00E8re utilisation: ".concat(stats.dateFirstUsed || 'Jamais utilisée'));
            console.log("  \uD83D\uDCC5 Derni\u00E8re utilisation: ".concat(stats.dateLastUsed || 'Jamais utilisée'));
            console.log("  \uD83D\uDCCA Total requ\u00EAtes: ".concat(stats.totalRequests));
            console.log("  \uD83D\uDCCB Sessions: ".concat(stats.sessionsHistory.length));
            if (stats.sessionsHistory.length > 0) {
                var lastSession = stats.sessionsHistory[stats.sessionsHistory.length - 1];
                console.log("  \uD83D\uDCDD Derni\u00E8re session: ".concat(lastSession.date, " - ").concat(lastSession.requestsInSession, " req"));
            }
        });
    };
    KeyManager.prototype.isRateLimitError = function (error) {
        return error.message.includes('429') &&
            (error.message.includes('Rate limit exceeded') ||
                error.message.includes('Provider returned error') ||
                error.message.includes('rate-limited upstream'));
    };
    KeyManager.prototype.calculateNextAvailability = function () {
        var now = new Date();
        var tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        var msUntilReset = tomorrow.getTime() - now.getTime();
        var hoursUntilReset = Math.ceil(msUntilReset / (1000 * 60 * 60));
        return {
            nextResetTime: tomorrow.toISOString(),
            hoursUntilReset: hoursUntilReset,
            resetTimeLocal: tomorrow.toLocaleString('fr-FR')
        };
    };
    KeyManager.prototype.checkAndResetDailyLimits = function () {
        return __awaiter(this, void 0, void 0, function () {
            var today, lastSession;
            return __generator(this, function (_a) {
                today = new Date().toLocaleDateString('fr-FR');
                lastSession = Object.values(this.keyUsageStats).find(function (stats) {
                    return stats.sessionsHistory.length > 0 &&
                        stats.sessionsHistory[stats.sessionsHistory.length - 1].date === today;
                });
                if (!lastSession) {
                    // Nouveau jour, réinitialiser les compteurs
                    console.log('🔄 Nouveau jour détecté, réinitialisation des compteurs de clés');
                    this.resetKeyStatus();
                }
                else {
                    // Même jour, vérifier les limites actuelles
                    console.log('📅 Même jour détecté, vérification des limites de clés');
                    this.checkCurrentKeyLimits();
                }
                return [2 /*return*/];
            });
        });
    };
    KeyManager.prototype.checkCurrentKeyLimits = function () {
        var _this = this;
        this.apiKeys.forEach(function (key, index) {
            var _a, _b, _c;
            var todayRequests = ((_c = (_b = (_a = _this.keyUsageStats[index]) === null || _a === void 0 ? void 0 : _a.sessionsHistory) === null || _b === void 0 ? void 0 : _b.filter(function (session) { return session.date === new Date().toLocaleDateString('fr-FR'); })) === null || _c === void 0 ? void 0 : _c.reduce(function (total, session) { return total + session.requestsInSession; }, 0)) || 0;
            if (todayRequests >= _this.rateLimitPerKey) {
                _this.keysExhausted.add(index);
                console.log("\u26A0\uFE0F Cl\u00E9 ".concat(index + 1, " d\u00E9j\u00E0 \u00E9puis\u00E9e aujourd'hui (").concat(todayRequests, "/").concat(_this.rateLimitPerKey, ")"));
            }
            else {
                _this.requestCounters[index] = todayRequests;
                console.log("\u2705 Cl\u00E9 ".concat(index + 1, " disponible (").concat(todayRequests, "/").concat(_this.rateLimitPerKey, ")"));
            }
        });
        // Trouver la première clé disponible
        for (var i = 0; i < this.apiKeys.length; i++) {
            if (!this.keysExhausted.has(i)) {
                this.currentKeyIndex = i;
                console.log("\uD83C\uDFAF Cl\u00E9 ".concat(i + 1, " s\u00E9lectionn\u00E9e comme cl\u00E9 active"));
                break;
            }
        }
    };
    return KeyManager;
}());
exports.KeyManager = KeyManager;
