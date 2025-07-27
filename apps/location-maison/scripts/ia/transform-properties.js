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
exports.main = main;
var facebook_post_extractor_1 = require("./extractors/facebook-post-extractor");
var ai_property_mapper_1 = require("./mappers/ai-property-mapper");
var config_loader_1 = require("./config/config-loader");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var extractor, mapper, posts, results, successful, failed, transformedData, config, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🚀 Démarrage de la transformation des propriétés Facebook via IA...\n');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 12, , 13]);
                    // 1. Charger la configuration
                    console.log('📋 Chargement de la configuration...');
                    return [4 /*yield*/, config_loader_1.configLoader.loadConfig()];
                case 2:
                    _a.sent();
                    console.log('✅ Configuration chargée\n');
                    // 2. Initialiser les composants
                    console.log('🔧 Initialisation des composants...');
                    extractor = new facebook_post_extractor_1.FacebookPostExtractor();
                    mapper = new ai_property_mapper_1.AIPropertyMapper();
                    return [4 /*yield*/, mapper.initialize()];
                case 3:
                    _a.sent();
                    console.log('✅ Composants initialisés\n');
                    // 3. Charger les posts Facebook
                    console.log('📄 Chargement des posts Facebook...');
                    return [4 /*yield*/, extractor.loadPropertyData()];
                case 4:
                    posts = _a.sent();
                    console.log("\u2705 ".concat(posts.length, " posts charg\u00E9s\n"));
                    // 4. Afficher le statut des clés API
                    console.log('🔑 Statut des clés API :');
                    mapper['keyManager'].getKeyStatus();
                    // 5. Transformer les posts via IA
                    console.log('🤖 Début de la transformation IA...');
                    return [4 /*yield*/, mapper.mapPostsToProperties(posts)];
                case 5:
                    results = _a.sent();
                    successful = results.filter(function (r) { return r.success; });
                    failed = results.filter(function (r) { return !r.success; });
                    console.log('\n📊 RÉSULTATS DE LA TRANSFORMATION :');
                    console.log("\u2705 Succ\u00E8s : ".concat(successful.length, "/").concat(results.length));
                    console.log("\u274C \u00C9checs : ".concat(failed.length, "/").concat(results.length));
                    if (!(successful.length > 0)) return [3 /*break*/, 7];
                    console.log('\n💾 Sauvegarde des propriétés transformées...');
                    transformedData = successful.map(function (r) { return r.data; });
                    return [4 /*yield*/, extractor.saveTransformedData(transformedData)];
                case 6:
                    _a.sent();
                    console.log('✅ Données sauvegardées\n');
                    return [3 /*break*/, 8];
                case 7:
                    console.log('\n⚠️ Aucune propriété transformée avec succès');
                    _a.label = 8;
                case 8:
                    // 8. Afficher les échecs
                    if (failed.length > 0) {
                        console.log('\n❌ POSTS EN ÉCHEC :');
                        failed.forEach(function (result, index) {
                            var _a, _b;
                            console.log("  ".concat(index + 1, ". ").concat((_b = (_a = result.originalPost) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.substring(0, 50), "..."));
                            console.log("     Erreur : ".concat(result.error));
                        });
                    }
                    // 9. Finaliser et afficher les stats
                    console.log('📈 Finalisation...');
                    return [4 /*yield*/, mapper.finalize()];
                case 9:
                    _a.sent();
                    console.log('\n🎉 TRANSFORMATION TERMINÉE !');
                    console.log("\uD83D\uDCC4 Posts trait\u00E9s : ".concat(results.length));
                    console.log("\u2705 Propri\u00E9t\u00E9s g\u00E9n\u00E9r\u00E9es : ".concat(successful.length));
                    console.log("\u274C \u00C9checs : ".concat(failed.length));
                    if (!(successful.length > 0)) return [3 /*break*/, 11];
                    return [4 /*yield*/, config_loader_1.configLoader.loadConfig()];
                case 10:
                    config = _a.sent();
                    console.log("\uD83D\uDCC1 Fichier de sortie : ".concat(config.files.output));
                    _a.label = 11;
                case 11:
                    // 10. Arrêter le script proprement
                    process.exit(0);
                    return [3 /*break*/, 13];
                case 12:
                    error_1 = _a.sent();
                    console.error('\n❌ ERREUR FATALE :', error_1);
                    process.exit(1);
                    return [3 /*break*/, 13];
                case 13: return [2 /*return*/];
            }
        });
    });
}
// Point d'entrée
if (require.main === module) {
    main();
}
