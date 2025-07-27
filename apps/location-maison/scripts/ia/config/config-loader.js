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
exports.configLoader = exports.ConfigLoader = void 0;
var fs = require("fs/promises");
var yaml = require("js-yaml");
var path = require("path");
var ConfigLoader = /** @class */ (function () {
    function ConfigLoader() {
        this.config = null;
    }
    ConfigLoader.getInstance = function () {
        if (!ConfigLoader.instance) {
            ConfigLoader.instance = new ConfigLoader();
        }
        return ConfigLoader.instance;
    };
    ConfigLoader.prototype.loadConfig = function (configPath) {
        return __awaiter(this, void 0, void 0, function () {
            var defaultPath, configFile, content, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.config) {
                            return [2 /*return*/, this.config];
                        }
                        defaultPath = path.join(__dirname, 'config.yaml');
                        configFile = configPath || defaultPath;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fs.readFile(configFile, 'utf-8')];
                    case 2:
                        content = _a.sent();
                        this.config = yaml.load(content);
                        // Validation de base
                        this.validateConfig(this.config);
                        console.log('✅ Configuration chargée avec succès');
                        return [2 /*return*/, this.config];
                    case 3:
                        error_1 = _a.sent();
                        console.error('❌ Erreur lors du chargement de la configuration:', error_1);
                        throw new Error("Impossible de charger la configuration depuis ".concat(configFile));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ConfigLoader.prototype.getConfig = function () {
        if (!this.config) {
            throw new Error('Configuration non chargée. Appelez loadConfig() d\'abord.');
        }
        return this.config;
    };
    ConfigLoader.prototype.validateConfig = function (config) {
        var _a, _b, _c;
        if (!((_a = config.api) === null || _a === void 0 ? void 0 : _a.keys) || config.api.keys.length === 0) {
            throw new Error('Configuration invalide: aucune clé API définie');
        }
        if (!((_b = config.api.openrouter) === null || _b === void 0 ? void 0 : _b.url)) {
            throw new Error('Configuration invalide: URL OpenRouter manquante');
        }
        if (!((_c = config.api.openrouter) === null || _c === void 0 ? void 0 : _c.model)) {
            throw new Error('Configuration invalide: modèle OpenRouter manquant');
        }
        if (config.limits.rate_limit_per_key <= 0) {
            throw new Error('Configuration invalide: rate_limit_per_key doit être positif');
        }
        if (!config.tags.available_tags || config.tags.available_tags.length === 0) {
            throw new Error('Configuration invalide: aucun tag disponible défini');
        }
    };
    // Méthodes utilitaires pour accéder aux configurations
    ConfigLoader.prototype.getApiKeys = function () {
        return this.getConfig().api.keys;
    };
    ConfigLoader.prototype.getOpenRouterConfig = function () {
        return this.getConfig().api.openrouter;
    };
    ConfigLoader.prototype.getLimits = function () {
        return this.getConfig().limits;
    };
    ConfigLoader.prototype.getAvailableTags = function () {
        return this.getConfig().tags.available_tags;
    };
    ConfigLoader.prototype.getFiles = function () {
        return this.getConfig().files;
    };
    ConfigLoader.prototype.getLogging = function () {
        return this.getConfig().logging;
    };
    return ConfigLoader;
}());
exports.ConfigLoader = ConfigLoader;
// Export d'une instance singleton
exports.configLoader = ConfigLoader.getInstance();
