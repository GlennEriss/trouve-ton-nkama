const fs = require('fs');
const data = [{"facebookUrl":"https://www.facebook.com/groups/1227810011219532","text":"S'il vous plaît besoin de votre aide.\nJe dois quitter la maison familiale avant le 05 Janvier où j'y étais pour cause AVC sévère depuis Juillet 2025. Je cherche une chambre, un petit studio en planche, demi dur ou en dur près du carrefour SNI Owendo car je travaille dans la SNI Owendo. 50-60mil avec charges. Je suis discrète, effacée, propre et déteste le bruit.\nNB: Pervers et blagueurs s'abstenir ⛔❌ \nWatsapp : 066491806","user":{"id":"737398652755976","name":"Anonymous participant"},"likesCount":0,"commentsCount":0}];
fs.writeFileSync('property.json', JSON.stringify(data, null, 2), 'utf8');
console.log('JSON sauvegardé');
