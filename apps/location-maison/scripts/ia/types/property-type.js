"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeProperty = exports.TypePropertyEnum = void 0;
exports.getTypePropertyKey = getTypePropertyKey;
//Type property enum
exports.TypePropertyEnum = {
    Home: "home",
    Studio: "studio",
    Apartment: "apartment",
    Desk: "desk",
    Building: "building",
    Shop: "shop",
    Kiosk: "kiosk",
    Room: "room",
    Property: "property",
    Logement: "logement",
    Villa: 'villa',
    Land: 'land'
};
exports.TypeProperty = {
    Home: "Maison",
    Apartment: "Appartement",
    Studio: "Studio",
    Room: "Chambre",
    Kiosk: "Kiosque",
    Shop: "Magasin",
    Desk: "Bureau",
    Building: "Immeuble",
    Land: "Terrain",
    // Villa: "Villa"
};
/**
 * Retourne la clé associée à une valeur donnée dans TypeProperty.
 *
 * @param value - La valeur à rechercher (ex. "Maison").
 * @returns La clé correspondante (ex. "Home"), ou undefined si aucune correspondance n'est trouvée.
 */
function getTypePropertyKey(value) {
    return Object.keys(exports.TypeProperty).find(function (key) { return exports.TypeProperty[key] === value; });
}
