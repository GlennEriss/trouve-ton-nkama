const fs = require('fs');
const path = require('path');

function convertLogoToBase64() {
  console.log('🖼️  CONVERSION LOGO EN BASE64 POUR EMAILS');
  console.log('==========================================\n');

  const logoPath = path.join(__dirname, '..', 'public', 'emails', 'logo-email.png');
  
  try {
    // Lire le fichier logo
    const logoBuffer = fs.readFileSync(logoPath);
    const logoBase64 = logoBuffer.toString('base64');
    const logoDataUri = `data:image/png;base64,${logoBase64}`;
    
    console.log('✅ Logo converti avec succès !');
    console.log(`📏 Taille: ${Math.round(logoBuffer.length / 1024)} KB`);
    console.log(`📊 Taille Base64: ${Math.round(logoBase64.length / 1024)} KB`);
    
    // Créer le code TypeScript pour intégrer dans les emails
    const logoConstant = `
// Logo en Base64 pour les emails (ne nécessite pas d'hébergement externe)
export const LOGO_BASE64 = "${logoDataUri}";

// Utilisation dans vos templates :
// <Img src={LOGO_BASE64} alt="Logo Trouve Ton Nkama" style={styleHeaderLogo} />
    `.trim();
    
    // Sauvegarder dans un fichier TypeScript
    const outputPath = path.join(__dirname, '..', 'src', 'emails', 'logo-base64.ts');
    fs.writeFileSync(outputPath, logoConstant);
    
    console.log(`✅ Fichier créé: src/emails/logo-base64.ts`);
    console.log('\n📝 Instructions d\'utilisation:');
    console.log('1. Importez: import { LOGO_BASE64 } from "./logo-base64";');
    console.log('2. Utilisez: <Img src={LOGO_BASE64} alt="Logo" />');
    console.log('\n💡 Avantages:');
    console.log('   - Pas besoin d\'hébergement externe');
    console.log('   - Fonctionne même hors ligne');
    console.log('   - Toujours disponible');
    
    console.log('\n⚠️  Inconvénients:');
    console.log('   - Augmente la taille de l\'email');
    console.log('   - Certains clients peuvent bloquer les images Base64');
    
  } catch (error) {
    console.error('❌ Erreur lors de la conversion:', error.message);
    console.log('\n💡 Vérifiez que le fichier existe:');
    console.log(`   ${logoPath}`);
  }
}

convertLogoToBase64(); 