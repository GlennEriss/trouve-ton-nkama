import React, { CSSProperties } from "react";
import { Text } from "@react-email/text";
import { Section } from "@react-email/section";
import { Row } from "@react-email/row";
import { Column } from "@react-email/column";
import { Button } from "@react-email/button";
import { Hr } from "@react-email/hr";
import { Img } from "@react-email/img";
import Layout from "./Layout";
import theme from "./theme";
import { WelcomeEmailProps } from "./types";
import { supportContact } from "../constantes";

const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  name,
  email,
  texts,
}) => {
  return (
    <Layout
      copyRight={texts.copyRight}
      socialLinks={{
        facebook: "https://facebook.com/trouveton.nkama",
        instagram: "https://instagram.com/trouveton.nkama",
      }}
    >
      {/* Section d'accueil avec icône */}
      <Section style={styleWelcomeSection} className="mobile-section">
        <Row>
          <Column align="center">
            <div style={styleWelcomeIcon}>🎉</div>
            <Text style={styleWelcomeTitle} className="mobile-text-large">
              {`Bienvenue sur Trouve Ton Nkama, ${name} !`}
            </Text>
            <Text style={styleWelcomeSubtitle} className="mobile-text-medium">
              {"Votre compte a été créé avec succès"}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Message de bienvenue principal */}
      <Section style={styleMainContent}>
        <Row>
          <Column>
            <Text style={styleGreeting} className="mobile-text-medium">
              Bonjour {name},
            </Text>
            <Text style={styleMainText} className="mobile-text-medium">
              {texts.welcomeMessage}
              <span style={styleEmailHighlight}>{email}</span>
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Cadeau de bienvenue */}
      <Section style={styleGiftSection} className="mobile-section">
        <Row>
          <Column align="center">
            <div style={styleGiftIcon}>🎁</div>
            <Text style={styleGiftTitle} className="mobile-text-medium">
              {"Cadeau de bienvenue"}
            </Text>
            <Text style={styleGiftText} className="mobile-text-small">
              {"Pour bien commencer, nous vous offrons 3 crédits gratuits pour consulter les contacts des propriétaires !"}
            </Text>
            <div style={styleCreditsDisplay}>
              <span style={styleCreditsAmount}>3 crédits</span>
              <span style={styleCreditsLabel}>gratuits</span>
            </div>
          </Column>
        </Row>
      </Section>

      {/* Bouton d'action principal */}
      <Section style={styleActionSection}>
        <Row>
          <Column align="center">
            <Button
              href={texts.ctaButtonUrl}
              style={styleMainButton}
              className="mobile-button"
            >
              {texts.ctaButtonText}
            </Button>
          </Column>
        </Row>
      </Section>

      <Hr style={styleHr} />

      {/* Fonctionnalités clés */}
      <Section style={styleFeaturesSection}>
        <Row>
          <Column>
            <Text style={styleFeaturesSectionTitle} className="mobile-text-medium">
              {texts.featuresTitle || "Découvrez ce que vous pouvez faire :"}
            </Text>
          </Column>
        </Row>
        
        <Row>
          <Column style={styleFeatureColumn}>
            <div style={styleFeatureIcon}>🏠</div>
            <Text style={styleFeatureTitle} className="mobile-text-small">Rechercher des biens</Text>
            <Text style={styleFeatureText} className="mobile-text-small">
              Trouvez la propriété idéale parmi des milliers d'annonces vérifiées
            </Text>
          </Column>
          <Column style={styleFeatureColumn}>
            <div style={styleFeatureIcon}>📝</div>
            <Text style={styleFeatureTitle} className="mobile-text-small">Publier gratuitement</Text>
            <Text style={styleFeatureText} className="mobile-text-small">
              Mettez en ligne vos biens immobiliers rapidement et facilement
            </Text>
          </Column>
        </Row>
        
        <Row>
          <Column style={styleFeatureColumn}>
            <div style={styleFeatureIcon}>💰</div>
            <Text style={styleFeatureTitle} className="mobile-text-small">Contacts directs</Text>
            <Text style={styleFeatureText} className="mobile-text-small">
              Contactez directement les propriétaires avec vos crédits
            </Text>
          </Column>
          <Column style={styleFeatureColumn}>
            <div style={styleFeatureIcon}>🔔</div>
            <Text style={styleFeatureTitle} className="mobile-text-small">Alertes personnalisées</Text>
            <Text style={styleFeatureText} className="mobile-text-small">
              Recevez des notifications pour les biens qui vous intéressent
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Guide de démarrage */}
      <Section style={styleGuideSection} className="mobile-section">
        <Row>
          <Column>
            <Text style={styleGuideTitle} className="mobile-text-medium">
              {texts.gettingStartedTitle}
            </Text>
            <div style={styleGuideList}>
              <Text style={styleGuideItem} className="mobile-text-small">
                <span style={styleGuideNumber}>1.</span>
                Complétez votre profil pour des recommandations personnalisées
              </Text>
              <Text style={styleGuideItem} className="mobile-text-small">
                <span style={styleGuideNumber}>2.</span>
                Définissez vos critères de recherche (prix, localisation, type)
              </Text>
              <Text style={styleGuideItem} className="mobile-text-small">
                <span style={styleGuideNumber}>3.</span>
                Explorez les annonces et utilisez vos crédits gratuits
              </Text>
              <Text style={styleGuideItem} className="mobile-text-small">
                <span style={styleGuideNumber}>4.</span>
                Configurez des alertes pour ne rien manquer
              </Text>
            </div>
          </Column>
        </Row>
      </Section>

      {/* Section d'aide */}
      <Section style={styleHelpSection}>
        <Row>
          <Column align="center">
            <Text style={styleHelpTitle} className="mobile-text-medium">
              {"Besoin d'aide ?"}
            </Text>
            <Text style={styleHelpText} className="mobile-text-small">
              {texts.supportMessage}
            </Text>
            <Text style={styleHelpContact} className="mobile-text-small">
              📧 {supportContact.email} | 📞 {supportContact.phone}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Message de fin */}
      <Section style={styleClosingSection}>
        <Row>
          <Column>
            <Text style={styleClosingText} className="mobile-text-small">
              {texts.supportMessage}
            </Text>
            <Text style={styleSignature} className="mobile-text-small">
              L'équipe Trouve Ton Nkama
            </Text>
          </Column>
        </Row>
      </Section>
    </Layout>
  );
};

export default WelcomeEmail;

// Styles optimisés pour mobile
const styleWelcomeSection: CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "20px 15px", // Réduit de 30px 20px à 20px 15px
  borderRadius: "6px", // Réduit de 8px à 6px
  marginBottom: "20px", // Réduit de 30px à 20px
  textAlign: "center",
};

const styleWelcomeIcon: CSSProperties = {
  fontSize: "36px", // Réduit de 48px à 36px
  marginBottom: "12px", // Réduit de 15px à 12px
};

const styleWelcomeTitle: CSSProperties = {
  fontSize: "20px", // Réduit de 24px à 20px
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 8px 0", // Réduit de 10px à 8px
  fontFamily: theme.fonts.heading,
};

const styleWelcomeSubtitle: CSSProperties = {
  fontSize: "14px", // Réduit de 16px à 14px
  color: theme.colors.textSecondary,
  margin: "0",
  fontFamily: theme.fonts.body,
};

const styleMainContent: CSSProperties = {
  marginBottom: "20px", // Réduit de 30px à 20px
};

const styleGreeting: CSSProperties = {
  fontSize: "16px", // Réduit de 18px à 16px
  fontWeight: "600",
  color: theme.colors.primary,
  margin: "0 0 12px 0", // Réduit de 15px à 12px
  fontFamily: theme.fonts.heading,
};

const styleMainText: CSSProperties = {
  fontSize: "14px", // Réduit de 16px à 14px
  lineHeight: "1.5", // Réduit de 1.6 à 1.5
  color: theme.colors.gray[700],
  margin: "0 0 15px 0", // Réduit de 20px à 15px
  fontFamily: theme.fonts.body,
};

const styleEmailHighlight: CSSProperties = {
  fontWeight: "600",
  color: theme.colors.secondary,
  backgroundColor: "#f8f9fa",
  padding: "1px 4px", // Réduit de 2px 6px à 1px 4px
  borderRadius: "3px", // Réduit de 4px à 3px
};

const styleGiftSection: CSSProperties = {
  backgroundColor: `linear-gradient(135deg, ${theme.colors.primary}15 0%, ${theme.colors.secondary}15 100%)`,
  padding: "20px 15px", // Réduit de 25px 20px à 20px 15px
  borderRadius: "6px", // Réduit de 8px à 6px
  marginBottom: "20px", // Réduit de 30px à 20px
  textAlign: "center",
  border: `1px solid ${theme.colors.primary}30`, // Réduit de 2px à 1px
};

const styleGiftIcon: CSSProperties = {
  fontSize: "32px", // Réduit de 40px à 32px
  marginBottom: "12px", // Réduit de 15px à 12px
};

const styleGiftTitle: CSSProperties = {
  fontSize: "18px", // Réduit de 20px à 18px
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 8px 0", // Réduit de 10px à 8px
  fontFamily: theme.fonts.heading,
};

const styleGiftText: CSSProperties = {
  fontSize: "14px", // Réduit de 16px à 14px
  color: theme.colors.gray[700],
  margin: "0 0 15px 0", // Réduit de 20px à 15px
  lineHeight: "1.4", // Réduit de 1.5 à 1.4
  fontFamily: theme.fonts.body,
};

const styleCreditsDisplay: CSSProperties = {
  display: "inline-block",
  backgroundColor: theme.colors.secondary,
  color: "white",
  padding: "10px 20px", // Réduit de 12px 24px à 10px 20px
  borderRadius: "20px", // Réduit de 25px à 20px
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
};

const styleCreditsAmount: CSSProperties = {
  fontSize: "18px", // Réduit de 20px à 18px
  fontWeight: "bold",
  marginRight: "6px", // Réduit de 8px à 6px
};

const styleCreditsLabel: CSSProperties = {
  fontSize: "12px", // Réduit de 14px à 12px
  opacity: "0.9",
};

const styleActionSection: CSSProperties = {
  textAlign: "center",
  marginBottom: "20px", // Réduit de 30px à 20px
};

const styleMainButton: CSSProperties = {
  backgroundColor: theme.colors.primary,
  color: "white",
  padding: "12px 24px", // Réduit de 16px 32px à 12px 24px
  borderRadius: "6px", // Réduit de 8px à 6px
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "14px", // Réduit de 16px à 14px
  border: "none",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease",
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${theme.colors.muted}`,
  margin: "20px 0", // Réduit de 30px à 20px
};

const styleFeaturesSection: CSSProperties = {
  marginBottom: "20px", // Réduit de 30px à 20px
};

const styleFeaturesSectionTitle: CSSProperties = {
  fontSize: "18px", // Réduit de 20px à 18px
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 20px 0", // Réduit de 25px à 20px
  fontFamily: theme.fonts.heading,
};

const styleFeatureColumn: CSSProperties = {
  width: "50%",
  padding: "0 8px", // Réduit de 10px à 8px
  marginBottom: "15px", // Réduit de 20px à 15px
  verticalAlign: "top",
};

const styleFeatureIcon: CSSProperties = {
  fontSize: "28px", // Réduit de 32px à 28px
  marginBottom: "8px", // Réduit de 10px à 8px
};

const styleFeatureTitle: CSSProperties = {
  fontSize: "14px", // Réduit de 16px à 14px
  fontWeight: "600",
  color: theme.colors.primary,
  margin: "0 0 6px 0", // Réduit de 8px à 6px
  fontFamily: theme.fonts.heading,
};

const styleFeatureText: CSSProperties = {
  fontSize: "12px", // Réduit de 14px à 12px
  color: theme.colors.gray[600],
  margin: "0",
  lineHeight: "1.3", // Réduit de 1.4 à 1.3
  fontFamily: theme.fonts.body,
};

const styleGuideSection: CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "20px 15px", // Réduit de 25px 20px à 20px 15px
  borderRadius: "6px", // Réduit de 8px à 6px
  marginBottom: "20px", // Réduit de 30px à 20px
};

const styleGuideTitle: CSSProperties = {
  fontSize: "16px", // Réduit de 18px à 16px
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 15px 0", // Réduit de 20px à 15px
  fontFamily: theme.fonts.heading,
};

const styleGuideList: CSSProperties = {
  marginLeft: "0",
};

const styleGuideItem: CSSProperties = {
  fontSize: "13px", // Réduit de 15px à 13px
  color: theme.colors.gray[700],
  margin: "0 0 10px 0", // Réduit de 12px à 10px
  lineHeight: "1.4", // Réduit de 1.5 à 1.4
  fontFamily: theme.fonts.body,
};

const styleGuideNumber: CSSProperties = {
  display: "inline-block",
  backgroundColor: theme.colors.secondary,
  color: "white",
  width: "20px", // Réduit de 24px à 20px
  height: "20px", // Réduit de 24px à 20px
  borderRadius: "50%",
  textAlign: "center",
  fontSize: "12px", // Réduit de 14px à 12px
  fontWeight: "bold",
  marginRight: "10px", // Réduit de 12px à 10px
  lineHeight: "20px", // Réduit de 24px à 20px
};

const styleHelpSection: CSSProperties = {
  textAlign: "center",
  marginBottom: "20px", // Réduit de 30px à 20px
};

const styleHelpTitle: CSSProperties = {
  fontSize: "16px", // Réduit de 18px à 16px
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 12px 0", // Réduit de 15px à 12px
  fontFamily: theme.fonts.heading,
};

const styleHelpText: CSSProperties = {
  fontSize: "14px", // Réduit de 16px à 14px
  color: theme.colors.gray[700],
  margin: "0 0 12px 0", // Réduit de 15px à 12px
  lineHeight: "1.4", // Réduit de 1.5 à 1.4
  fontFamily: theme.fonts.body,
};

const styleHelpContact: CSSProperties = {
  fontSize: "12px", // Réduit de 14px à 12px
  color: theme.colors.textSecondary,
  margin: "0",
  fontFamily: theme.fonts.body,
};

const styleClosingSection: CSSProperties = {
  textAlign: "center",
};

const styleClosingText: CSSProperties = {
  fontSize: "14px", // Réduit de 16px à 14px
  color: theme.colors.gray[700],
  margin: "0 0 15px 0", // Réduit de 20px à 15px
  lineHeight: "1.4",
  fontFamily: theme.fonts.body,
};

const styleSignature: CSSProperties = {
  fontSize: "14px", // Réduit de 16px à 14px
  fontWeight: "600",
  color: theme.colors.primary,
  margin: "0",
  fontFamily: theme.fonts.heading,
}; 