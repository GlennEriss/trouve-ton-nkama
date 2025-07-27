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
exports.FacebookPostExtractor = void 0;
var fs = require("fs/promises");
var path = require("path");
var config_loader_1 = require("../config/config-loader");
var FacebookPostExtractor = /** @class */ (function () {
    function FacebookPostExtractor() {
        this.config = config_loader_1.configLoader;
    }
    FacebookPostExtractor.prototype.loadPropertyData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, inputPath, content, data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.config.loadConfig()];
                    case 1:
                        config = _a.sent();
                        inputPath = path.resolve(__dirname, config.files.input);
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fs.readFile(inputPath, 'utf-8')];
                    case 3:
                        content = _a.sent();
                        data = JSON.parse(content);
                        if (!Array.isArray(data)) {
                            throw new Error('Le fichier property.json doit contenir un tableau');
                        }
                        console.log("\uD83D\uDCC4 ".concat(data.length, " posts Facebook charg\u00E9s depuis ").concat(config.files.input));
                        return [2 /*return*/, data];
                    case 4:
                        error_1 = _a.sent();
                        console.error('❌ Erreur lors du chargement des posts Facebook:', error_1);
                        throw error_1;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    FacebookPostExtractor.prototype.saveTransformedData = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var config, outputPath, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.config.loadConfig()];
                    case 1:
                        config = _a.sent();
                        outputPath = path.resolve(__dirname, config.files.output);
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8')];
                    case 3:
                        _a.sent();
                        console.log("\uD83D\uDCBE ".concat(data.length, " propri\u00E9t\u00E9s transform\u00E9es sauvegard\u00E9es dans ").concat(config.files.output));
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        console.error('❌ Erreur lors de la sauvegarde:', error_2);
                        throw error_2;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // Méthode pour préparer les données pour l'IA (optionnel)
    FacebookPostExtractor.prototype.prepareForAI = function (posts) {
        return posts.map(function (post) { return ({
            id: post.id,
            text: post.text,
            date: post.date,
            url: post.url
        }); }).slice(0, 5); // Limiter pour test
    };
    return FacebookPostExtractor;
}());
exports.FacebookPostExtractor = FacebookPostExtractor;
