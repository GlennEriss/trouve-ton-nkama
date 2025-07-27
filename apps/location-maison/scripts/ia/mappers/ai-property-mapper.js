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
exports.AIPropertyMapper = void 0;
var node_fetch_1 = require("node-fetch");
var config_loader_1 = require("../config/config-loader");
var key_manager_1 = require("../utils/key-manager");
var AIPropertyMapper = /** @class */ (function () {
    function AIPropertyMapper() {
        this.config = config_loader_1.configLoader;
        this.keyManager = new key_manager_1.KeyManager();
    }
    AIPropertyMapper.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.keyManager.initialize()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.keyManager.loadKeyStats()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    AIPropertyMapper.prototype.buildPrompt = function (posts) {
        var availableTags = this.config.getAvailableTags();
        var post = posts[0];
        return "Tu es un assistant immobilier pour le Gabon. Transforme ce post Facebook en objet immobilier JSON.\n\nTYPES (premi\u00E8re lettre en majuscule): Studio|Apartment|Home|Building|Desk|Shop|Kiosk|Room|Land\nNOTE: Si c'est une \"villa\", utiliser \"Home\" comme typeProperty\n\nSTRUCTURE:\n{\n  \"typeProperty\": \"Type\",\n  \"title\": \"Titre court\",\n  \"description\": \"Description compl\u00E8te\",\n  \"price\": 250000,\n  \"status\": \"FOR_RENT\" ou \"FOR_SALE\",\n  \"contact\": \"t\u00E9l\u00E9phone\",\n  \"street\": \"rue\",\n  \"city\": \"ville Gabon\",\n  \"province\": \"province Gabon\",\n  \"country\": \"Gabon\",\n  \"countryCode\": \"GA\",\n  \"longitude\": 0,\n  \"latitude\": 0,\n  \"area\": 0,\n  \"tags\": [\"tag1\"],\n  \"images\": [\"url1\", \"url2\"],\n  \"nbrRooms\": 0,\n  \"nbrBathrooms\": 0,\n  \"nbrToilets\": 0,\n  \"nbrChickens\": 0\n}\n\nTAGS: ".concat(availableTags.join(', '), "\n\nR\u00C8GLES:\n- Prix en FCFA, coordonn\u00E9es 0 si non dispo, champs num\u00E9riques 0 si non pr\u00E9cis\u00E9\n- Images: utiliser les URLs fournies dans imageUrlList\n- TypeProperty: premi\u00E8re lettre en majuscule (Studio, Apartment, Home, etc.)\n- Si \"villa\" dans le texte \u2192 typeProperty = \"Home\"\n\nPOST: ").concat(JSON.stringify(post.text), "\nIMAGES: ").concat(JSON.stringify(post.imageUrlList), "\n\nR\u00C9PONDRE UNIQUEMENT AVEC UN TABLEAU JSON: [{\"propri\u00E9t\u00E9\"}]");
    };
    AIPropertyMapper.prototype.mapPostsToProperties = function (posts) {
        return __awaiter(this, void 0, void 0, function () {
            var results, i, post, result, config, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        results = [];
                        console.log("\uD83E\uDD16 D\u00E9but de la transformation IA de ".concat(posts.length, " posts..."));
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < posts.length)) return [3 /*break*/, 9];
                        post = posts[i];
                        console.log("\n--- Traitement du post ".concat(i + 1, "/").concat(posts.length, " ---"));
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 7, , 8]);
                        return [4 /*yield*/, this.mapSinglePost(post)];
                    case 3:
                        result = _b.sent();
                        results.push(result);
                        if (result.success) {
                            console.log("\u2705 Post ".concat(i + 1, " transform\u00E9 avec succ\u00E8s"));
                        }
                        else {
                            console.log("\u274C Erreur pour le post ".concat(i + 1, ": ").concat(result.error));
                            // Si toutes les clés sont épuisées, arrêter le traitement
                            if ((_a = result.error) === null || _a === void 0 ? void 0 : _a.includes('Toutes les clés API ont atteint leur limite')) {
                                console.log('\n🛑 Toutes les clés API sont épuisées. Arrêt du traitement.');
                                console.log("\uD83D\uDCCA R\u00E9sultats partiels : ".concat(results.filter(function (r) { return r.success; }).length, " succ\u00E8s sur ").concat(i + 1, " posts trait\u00E9s"));
                                return [3 /*break*/, 9];
                            }
                        }
                        if (!(i < posts.length - 1)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.config.loadConfig()];
                    case 4:
                        config = _b.sent();
                        return [4 /*yield*/, this.delay(config.limits.request_delay)];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_1 = _b.sent();
                        console.error("\u274C Erreur fatale pour le post ".concat(i + 1, ":"), error_1);
                        results.push({
                            success: false,
                            error: error_1 instanceof Error ? error_1.message : 'Erreur inconnue',
                            originalPost: post
                        });
                        // Si toutes les clés sont épuisées, arrêter le traitement
                        if (error_1 instanceof Error && error_1.message.includes('Toutes les clés API ont atteint leur limite')) {
                            console.log('\n🛑 Toutes les clés API sont épuisées. Arrêt du traitement.');
                            console.log("\uD83D\uDCCA R\u00E9sultats partiels : ".concat(results.filter(function (r) { return r.success; }).length, " succ\u00E8s sur ").concat(i + 1, " posts trait\u00E9s"));
                            return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 8];
                    case 8:
                        i++;
                        return [3 /*break*/, 1];
                    case 9: return [2 /*return*/, results];
                }
            });
        });
    };
    AIPropertyMapper.prototype.mapSinglePost = function (post) {
        return __awaiter(this, void 0, void 0, function () {
            var config, openRouterConfig, prompt, messages, payload, maxRetries, lastError, attempt, response, err, error, data, text, cleaned, match, result, property, coords, e_1, error_2;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, this.config.loadConfig()];
                    case 1:
                        config = _d.sent();
                        openRouterConfig = config.api.openrouter;
                        prompt = this.buildPrompt([post]);
                        messages = [
                            { role: "system", content: "Tu es un assistant immobilier qui répond toujours en JSON strictement valide." },
                            { role: "user", content: prompt }
                        ];
                        payload = {
                            model: openRouterConfig.model,
                            messages: messages,
                            max_tokens: openRouterConfig.max_tokens,
                            stream: openRouterConfig.stream
                        };
                        maxRetries = config.limits.max_retries;
                        lastError = null;
                        attempt = 0;
                        _d.label = 2;
                    case 2:
                        if (!(attempt < maxRetries)) return [3 /*break*/, 23];
                        _d.label = 3;
                    case 3:
                        _d.trys.push([3, 17, , 22]);
                        console.log("\uD83D\uDD11 Utilisation de la cl\u00E9 ".concat(this.keyManager.getCurrentKeyIndex() + 1));
                        return [4 /*yield*/, (0, node_fetch_1.default)(openRouterConfig.url, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": "Bearer ".concat(this.keyManager.getCurrentApiKey())
                                },
                                body: JSON.stringify(payload)
                            })];
                    case 4:
                        response = _d.sent();
                        if (!!response.ok) return [3 /*break*/, 10];
                        return [4 /*yield*/, response.text()];
                    case 5:
                        err = _d.sent();
                        error = new Error("OpenRouter API error: ".concat(response.status, " - ").concat(err));
                        if (!(response.status === 429 && this.keyManager.isRateLimitError(error))) return [3 /*break*/, 9];
                        console.log("\u26A0\uFE0F Limite temporaire atteinte, attente avant basculement...");
                        return [4 /*yield*/, this.delay(config.limits.retry_delay)];
                    case 6:
                        _d.sent();
                        if (!this.keyManager.switchToNextKey()) return [3 /*break*/, 8];
                        console.log("🔄 Tentative avec la clé suivante...");
                        return [4 /*yield*/, this.delay(1000)];
                    case 7:
                        _d.sent();
                        return [3 /*break*/, 22];
                    case 8: throw new Error("Toutes les clés API ont atteint leur limite quotidienne");
                    case 9: throw error;
                    case 10:
                        this.keyManager.incrementRequestCounter();
                        return [4 /*yield*/, response.json()];
                    case 11:
                        data = _d.sent();
                        text = ((_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || "";
                        console.log('\nRéponse brute OpenRouter :\n', text);
                        cleaned = text
                            .replace(/```json/gi, '')
                            .replace(/```/g, '')
                            .trim();
                        match = cleaned.match(/\[[\s\S]*\]/);
                        if (!match) return [3 /*break*/, 16];
                        _d.label = 12;
                    case 12:
                        _d.trys.push([12, 15, , 16]);
                        result = JSON.parse(match[0]);
                        property = result[0];
                        // Corriger le type de propriété
                        if (property.typeProperty) {
                            // Première lettre en majuscule
                            property.typeProperty = property.typeProperty.charAt(0).toUpperCase() + property.typeProperty.slice(1).toLowerCase();
                            // Si c'est "Villa", changer en "Home"
                            if (property.typeProperty === 'Villa') {
                                property.typeProperty = 'Home';
                            }
                        }
                        if (!(property.city && (property.longitude === 0 || property.latitude === 0))) return [3 /*break*/, 14];
                        return [4 /*yield*/, this.geolocateAddress(property.city, property.street)];
                    case 13:
                        coords = _d.sent();
                        property.longitude = coords.longitude;
                        property.latitude = coords.latitude;
                        _d.label = 14;
                    case 14:
                        // S'assurer que les images sont bien présentes
                        if (!property.images || property.images.length === 0) {
                            property.images = post.imageUrlList || [];
                        }
                        return [2 /*return*/, {
                                success: true,
                                data: property,
                                originalPost: post
                            }];
                    case 15:
                        e_1 = _d.sent();
                        console.warn('Erreur lors du parsing du JSON IA, réponse brute :', text);
                        throw new Error('Erreur de parsing JSON dans la réponse IA');
                    case 16:
                        console.warn('Aucun JSON détecté dans la réponse IA :', text);
                        throw new Error('Aucun JSON valide trouvé dans la réponse IA');
                    case 17:
                        error_2 = _d.sent();
                        lastError = error_2;
                        if (!this.keyManager.isRateLimitError(error_2)) return [3 /*break*/, 19];
                        console.log("\u26A0\uFE0F Limite atteinte: ".concat(error_2.message));
                        if (!this.keyManager.switchToNextKey()) return [3 /*break*/, 19];
                        console.log("🔄 Tentative avec la clé suivante...");
                        return [4 /*yield*/, this.delay(1000)];
                    case 18:
                        _d.sent();
                        return [3 /*break*/, 22];
                    case 19:
                        console.log("\u274C Erreur: ".concat(error_2.message));
                        if (!(attempt < maxRetries - 1)) return [3 /*break*/, 21];
                        console.log("\uD83D\uDD04 Nouvelle tentative (".concat(attempt + 2, "/").concat(maxRetries, ")..."));
                        return [4 /*yield*/, this.delay(config.limits.retry_delay)];
                    case 20:
                        _d.sent();
                        _d.label = 21;
                    case 21: return [3 /*break*/, 22];
                    case 22:
                        attempt++;
                        return [3 /*break*/, 2];
                    case 23: return [2 /*return*/, {
                            success: false,
                            error: (lastError === null || lastError === void 0 ? void 0 : lastError.message) || 'Échec après toutes les tentatives',
                            originalPost: post
                        }];
                }
            });
        });
    };
    AIPropertyMapper.prototype.delay = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    AIPropertyMapper.prototype.geolocateAddress = function (city, street) {
        return __awaiter(this, void 0, void 0, function () {
            var address, encodedAddress, url, response, data, _a, longitude, latitude, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        address = street ? "".concat(street, ", ").concat(city, ", Gabon") : "".concat(city, ", Gabon");
                        encodedAddress = encodeURIComponent(address);
                        url = "https://photon.komoot.io/api/?q=".concat(encodedAddress, "&limit=1");
                        return [4 /*yield*/, (0, node_fetch_1.default)(url)];
                    case 1:
                        response = _b.sent();
                        if (!response.ok) {
                            console.log("\u26A0\uFE0F Erreur g\u00E9olocalisation pour ".concat(address, ": ").concat(response.status));
                            return [2 /*return*/, { longitude: 0, latitude: 0 }];
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _b.sent();
                        if (data.features && data.features.length > 0) {
                            _a = data.features[0].geometry.coordinates, longitude = _a[0], latitude = _a[1];
                            console.log("\uD83D\uDCCD G\u00E9olocalisation r\u00E9ussie pour ".concat(address, ": ").concat(latitude, ", ").concat(longitude));
                            return [2 /*return*/, { longitude: longitude, latitude: latitude }];
                        }
                        console.log("\u26A0\uFE0F Aucune g\u00E9olocalisation trouv\u00E9e pour ".concat(address));
                        return [2 /*return*/, { longitude: 0, latitude: 0 }];
                    case 3:
                        error_3 = _b.sent();
                        console.log("\u274C Erreur g\u00E9olocalisation pour ".concat(city, ": ").concat(error_3));
                        return [2 /*return*/, { longitude: 0, latitude: 0 }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    AIPropertyMapper.prototype.finalize = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.keyManager.getCurrentKeyIndex() > 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.keyManager.saveKeyStats()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.keyManager.getDetailedKeyStats();
                        return [2 /*return*/];
                }
            });
        });
    };
    return AIPropertyMapper;
}());
exports.AIPropertyMapper = AIPropertyMapper;
