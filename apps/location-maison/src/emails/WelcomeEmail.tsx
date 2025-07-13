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
      <Section style={styleWelcomeSection}>
        <Row>
          <Column align="center">
            <div style={styleWelcomeIcon}>🎉</div>
            <Text style={styleWelcomeTitle}>
              {`Bienvenue sur Trouve Ton Nkama, ${name} !`}
            </Text>
            <Text style={styleWelcomeSubtitle}>
              {"Votre compte a été créé avec succès"}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Message de bienvenue principal */}
      <Section style={styleMainContent}>
        <Row>
          <Column>
            <Text style={styleGreeting}>
              Bonjour {name},
            </Text>
            <Text style={styleMainText}>
              {texts.welcomeMessage}
              <span style={styleEmailHighlight}>{email}</span>
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Cadeau de bienvenue */}
      <Section style={styleGiftSection}>
        <Row>
          <Column align="center">
            <div style={styleGiftIcon}>🎁</div>
            <Text style={styleGiftTitle}>
              {"Cadeau de bienvenue"}
            </Text>
            <Text style={styleGiftText}>
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
            <Text style={styleFeaturesSectionTitle}>
              {texts.featuresTitle || "Découvrez ce que vous pouvez faire :"}
            </Text>
          </Column>
        </Row>
        
        <Row>
          <Column style={styleFeatureColumn}>
            <div style={styleFeatureIcon}>🏠</div>
            <Text style={styleFeatureTitle}>Rechercher des biens</Text>
            <Text style={styleFeatureText}>
              Trouvez la propriété idéale parmi des milliers d'annonces vérifiées
            </Text>
          </Column>
          <Column style={styleFeatureColumn}>
            <div style={styleFeatureIcon}>📝</div>
            <Text style={styleFeatureTitle}>Publier gratuitement</Text>
            <Text style={styleFeatureText}>
              Mettez en ligne vos biens immobiliers rapidement et facilement
            </Text>
          </Column>
        </Row>
        
        <Row>
          <Column style={styleFeatureColumn}>
            <div style={styleFeatureIcon}>💰</div>
            <Text style={styleFeatureTitle}>Contacts directs</Text>
            <Text style={styleFeatureText}>
              Contactez directement les propriétaires avec vos crédits
            </Text>
          </Column>
          <Column style={styleFeatureColumn}>
            <div style={styleFeatureIcon}>🔔</div>
            <Text style={styleFeatureTitle}>Alertes personnalisées</Text>
            <Text style={styleFeatureText}>
              Recevez des notifications pour les biens qui vous intéressent
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Guide de démarrage */}
      <Section style={styleGuideSection}>
        <Row>
          <Column>
            <Text style={styleGuideTitle}>
              {texts.gettingStartedTitle}
            </Text>
            <div style={styleGuideList}>
              <Text style={styleGuideItem}>
                <span style={styleGuideNumber}>1.</span>
                Complétez votre profil pour des recommandations personnalisées
              </Text>
              <Text style={styleGuideItem}>
                <span style={styleGuideNumber}>2.</span>
                Définissez vos critères de recherche (prix, localisation, type)
              </Text>
              <Text style={styleGuideItem}>
                <span style={styleGuideNumber}>3.</span>
                Explorez les annonces et utilisez vos crédits gratuits
              </Text>
              <Text style={styleGuideItem}>
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
            <Text style={styleHelpTitle}>
              {"Besoin d'aide ?"}
            </Text>
            <Text style={styleHelpText}>
              {texts.supportMessage}
            </Text>
            <Text style={styleHelpContact}>
              📧 support@tonnkama.com | 📞 +241 XX XX XX XX
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Message de fin */}
      <Section style={styleClosingSection}>
        <Row>
          <Column>
            <Text style={styleClosingText}>
              {texts.supportMessage}
            </Text>
            <Text style={styleSignature}>
              L'équipe Trouve Ton Nkama
            </Text>
          </Column>
        </Row>
      </Section>
    </Layout>
  );
};

export default WelcomeEmail;

// Styles améliorés et professionnels
const styleWelcomeSection: CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "30px 20px",
  borderRadius: "8px",
  marginBottom: "30px",
  textAlign: "center",
};

const styleWelcomeIcon: CSSProperties = {
  fontSize: "48px",
  marginBottom: "15px",
};

const styleWelcomeTitle: CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 10px 0",
  fontFamily: theme.fonts.heading,
};

const styleWelcomeSubtitle: CSSProperties = {
  fontSize: "16px",
  color: theme.colors.textSecondary,
  margin: "0",
  fontFamily: theme.fonts.body,
};

const styleMainContent: CSSProperties = {
  marginBottom: "30px",
};

const styleGreeting: CSSProperties = {
  fontSize: "18px",
  fontWeight: "600",
  color: theme.colors.primary,
  margin: "0 0 15px 0",
  fontFamily: theme.fonts.heading,
};

const styleMainText: CSSProperties = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: theme.colors.gray[700],
  margin: "0 0 20px 0",
  fontFamily: theme.fonts.body,
};

const styleEmailHighlight: CSSProperties = {
  fontWeight: "600",
  color: theme.colors.secondary,
  backgroundColor: "#f8f9fa",
  padding: "2px 6px",
  borderRadius: "4px",
};

const styleGiftSection: CSSProperties = {
  backgroundColor: `linear-gradient(135deg, ${theme.colors.primary}15 0%, ${theme.colors.secondary}15 100%)`,
  padding: "25px 20px",
  borderRadius: "8px",
  marginBottom: "30px",
  textAlign: "center",
  border: `2px solid ${theme.colors.primary}30`,
};

const styleGiftIcon: CSSProperties = {
  fontSize: "40px",
  marginBottom: "15px",
};

const styleGiftTitle: CSSProperties = {
  fontSize: "20px",
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 10px 0",
  fontFamily: theme.fonts.heading,
};

const styleGiftText: CSSProperties = {
  fontSize: "16px",
  color: theme.colors.gray[700],
  margin: "0 0 20px 0",
  lineHeight: "1.5",
  fontFamily: theme.fonts.body,
};

const styleCreditsDisplay: CSSProperties = {
  display: "inline-block",
  backgroundColor: theme.colors.secondary,
  color: "white",
  padding: "12px 24px",
  borderRadius: "25px",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
};

const styleCreditsAmount: CSSProperties = {
  fontSize: "20px",
  fontWeight: "bold",
  marginRight: "8px",
};

const styleCreditsLabel: CSSProperties = {
  fontSize: "14px",
  opacity: "0.9",
};

const styleActionSection: CSSProperties = {
  textAlign: "center",
  marginBottom: "30px",
};

const styleMainButton: CSSProperties = {
  backgroundColor: theme.colors.primary,
  color: "white",
  padding: "16px 32px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "600",
  fontSize: "16px",
  border: "none",
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  transition: "all 0.3s ease",
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${theme.colors.muted}`,
  margin: "30px 0",
};

const styleFeaturesSection: CSSProperties = {
  marginBottom: "30px",
};

const styleFeaturesSectionTitle: CSSProperties = {
  fontSize: "20px",
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 25px 0",
  fontFamily: theme.fonts.heading,
};

const styleFeatureColumn: CSSProperties = {
  width: "50%",
  padding: "0 10px",
  marginBottom: "20px",
  verticalAlign: "top",
};

const styleFeatureIcon: CSSProperties = {
  fontSize: "32px",
  marginBottom: "10px",
};

const styleFeatureTitle: CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: theme.colors.primary,
  margin: "0 0 8px 0",
  fontFamily: theme.fonts.heading,
};

const styleFeatureText: CSSProperties = {
  fontSize: "14px",
  color: theme.colors.gray[600],
  margin: "0",
  lineHeight: "1.4",
  fontFamily: theme.fonts.body,
};

const styleGuideSection: CSSProperties = {
  backgroundColor: "#f8f9fa",
  padding: "25px 20px",
  borderRadius: "8px",
  marginBottom: "30px",
};

const styleGuideTitle: CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 20px 0",
  fontFamily: theme.fonts.heading,
};

const styleGuideList: CSSProperties = {
  marginLeft: "0",
};

const styleGuideItem: CSSProperties = {
  fontSize: "15px",
  color: theme.colors.gray[700],
  margin: "0 0 12px 0",
  lineHeight: "1.5",
  fontFamily: theme.fonts.body,
};

const styleGuideNumber: CSSProperties = {
  display: "inline-block",
  backgroundColor: theme.colors.secondary,
  color: "white",
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  textAlign: "center",
  fontSize: "14px",
  fontWeight: "bold",
  marginRight: "12px",
  lineHeight: "24px",
};

const styleHelpSection: CSSProperties = {
  textAlign: "center",
  marginBottom: "30px",
};

const styleHelpTitle: CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  color: theme.colors.primary,
  margin: "0 0 15px 0",
  fontFamily: theme.fonts.heading,
};

const styleHelpText: CSSProperties = {
  fontSize: "16px",
  color: theme.colors.gray[700],
  margin: "0 0 15px 0",
  lineHeight: "1.5",
  fontFamily: theme.fonts.body,
};

const styleHelpContact: CSSProperties = {
  fontSize: "14px",
  color: theme.colors.textSecondary,
  margin: "0",
  fontFamily: theme.fonts.body,
};

const styleClosingSection: CSSProperties = {
  textAlign: "center",
};

const styleClosingText: CSSProperties = {
  fontSize: "16px",
  color: theme.colors.gray[700],
  margin: "0 0 20px 0",
  lineHeight: "1.6",
  fontFamily: theme.fonts.body,
};

const styleSignature: CSSProperties = {
  fontSize: "16px",
  fontWeight: "600",
  color: theme.colors.primary,
  margin: "0",
  fontFamily: theme.fonts.heading,
}; 