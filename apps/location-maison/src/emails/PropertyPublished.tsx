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
import { PropertyPublishedProps } from "./types";

const PropertyPublished: React.FC<PropertyPublishedProps> = ({
  name,
  email,
  property,
  texts,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <Layout
      copyRight={texts.copyRight}
      supportEmail={texts.supportEmail}
      websiteUrl={texts.websiteUrl}
    >
      {/* Message de félicitations */}
      <Section>
        <Row>
          <Column>
            <Text style={styleGreeting} className="mobile-text-large">
              {texts.greeting} {name} ! 🎉
            </Text>
            <Text style={styleCongratulationsTitle} className="mobile-text-large">
              {texts.congratulationsTitle}
            </Text>
            <Text style={stylePublishedMessage} className="mobile-text-medium">
              {texts.publishedMessage}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Image de la propriété */}
      {property.imageUrl && (
        <Section className="mobile-section">
          <Row>
            <Column align="center">
              <Img
                src={property.imageUrl}
                alt={property.title}
                style={stylePropertyImage}
              />
            </Column>
          </Row>
        </Section>
      )}

      {/* Détails de la propriété */}
      <Section>
        <Row>
          <Column>
            <Text style={stylePropertyTitle} className="mobile-text-medium">
              {property.title}
            </Text>
            <Text style={stylePropertyLocation} className="mobile-text-small">
              📍 {property.location}
            </Text>
            <Text style={stylePropertyType} className="mobile-text-small">
              🏠 {property.type}
            </Text>
            {property.area && (
              <Text style={stylePropertyArea} className="mobile-text-small">
                📐 {property.area} m²
              </Text>
            )}
            <Text style={stylePropertyPrice} className="mobile-text-medium">
              💰 {formatPrice(property.price)}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Informations de publication */}
      <Section className="mobile-section">
        <Row>
          <Column>
            <Text style={stylePublicationInfo} className="mobile-text-small">
              📅 <strong>Publiée le :</strong> {formatDate(property.publishedAt)}
            </Text>
            <Text style={styleExpirationInfo} className="mobile-text-small">
              ⏰ <strong>Expire le :</strong> {formatDate(property.expiresAt)}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Boutons d'action */}
      <Section className="mobile-section">
        <Row>
          <Column align="center">
            <Button
              href={`${texts.websiteUrl}/annonce/${property.id}`}
              style={styleViewButton}
              className="mobile-button"
            >
              {texts.viewButtonText}
            </Button>
          </Column>
        </Row>
      </Section>

      <Section className="mobile-section">
        <Row>
          <Column align="center">
            <Button
              // /property/modify/[id] (ancien formulaire à 14 builders) a été retiré — voir
              // BUGS-PROPERTY-E2E-2026-08.md. Même destination que le bouton "Modifier" de
              // la gestion des annonces pour l'immobilier (seul type que ce template gérait).
              href={`${texts.websiteUrl}/property/create/preview/${property.id}`}
              style={styleEditButton}
              className="mobile-button"
            >
              {texts.editButtonText}
            </Button>
          </Column>
        </Row>
      </Section>

      <Section className="mobile-section">
        <Row>
          <Column align="center">
            <Button
              href={`${texts.websiteUrl}/annonce/${property.id}?share=true`}
              style={styleShareButton}
              className="mobile-button"
            >
              {texts.shareButtonText}
            </Button>
          </Column>
        </Row>
      </Section>

      <Hr style={styleHr} />

      {/* Gestion de l'annonce */}
      <Section>
        <Row>
          <Column>
            <Text style={styleManagementTitle} className="mobile-text-medium">
              {texts.managementTitle}
            </Text>
            <Text style={styleManagementOptions} className="mobile-text-small">
              {texts.managementOptions.map((option, index) => (
                <span key={index}>
                  • {option}
                  {index < texts.managementOptions.length - 1 && <br />}
                </span>
              ))}
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr style={styleHr} />

      {/* Conseils pour optimiser l'annonce */}
      <Section>
        <Row>
          <Column>
            <Text style={styleTipsTitle} className="mobile-text-medium">
              {texts.tipsTitle}
            </Text>
            <Text style={styleTipsList} className="mobile-text-small">
              {texts.tips.map((tip, index) => (
                <span key={index}>
                  💡 {tip}
                  {index < texts.tips.length - 1 && <br />}
                </span>
              ))}
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr style={styleHr} />

      {/* Liens utiles */}
      <Section>
        <Row>
          <Column>
            <Text style={styleLinksTitle} className="mobile-text-medium">
              Liens utiles pour gérer votre annonce :
            </Text>
            <Text style={styleLinksList} className="mobile-text-small">
              <a href={`${texts.websiteUrl}/property`} style={styleLinkItem}>
                📋 Mes annonces
              </a>
              <br />
              <a href={`${texts.websiteUrl}/property/add`} style={styleLinkItem}>
                ➕ Publier une nouvelle annonce
              </a>
              <br />
              <a href={`${texts.websiteUrl}/profil`} style={styleLinkItem}>
                👤 Mon profil
              </a>
              <br />
              <a href={`${texts.websiteUrl}/my-balance`} style={styleLinkItem}>
                💰 Mon solde de crédits
              </a>
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr style={styleHr} />

      {/* Statistiques et performance */}
      <Section>
        <Row>
          <Column>
            <Text style={styleStatsTitle} className="mobile-text-medium">
              📊 Suivez les performances de votre annonce :
            </Text>
            <Text style={styleStatsInfo} className="mobile-text-small">
              Vous recevrez des notifications par email lorsque des utilisateurs 
              consultent votre annonce ou vous contactent. Vous pouvez également 
              consulter les statistiques détaillées dans votre espace personnel.
            </Text>
          </Column>
        </Row>
      </Section>

      <Hr style={styleHr} />

      {/* Message de support */}
      <Section>
        <Row>
          <Column>
            <Text style={styleSupportMessage} className="mobile-text-small">
              Besoin d'aide pour gérer votre annonce ? Notre équipe support est 
              disponible pour vous accompagner à{" "}
              <a href={`mailto:${texts.supportEmail}`} style={styleEmailLink}>
                {texts.supportEmail}
              </a>
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Message de remerciement */}
      <Section>
        <Row>
          <Column>
            <Text style={styleClosingMessage} className="mobile-text-small">
              Merci de faire confiance à Trouve Ton Nkama pour votre annonce immobilière ! 🏡
            </Text>
          </Column>
        </Row>
      </Section>
    </Layout>
  );
};

export default PropertyPublished;

// Styles optimisés pour mobile
const styleGreeting: CSSProperties = {
  fontSize: "18px", // Réduit de theme.font.size.lg à 18px
  fontWeight: "600", // Réduit de theme.font.weight.medium à 600
  color: "#1f2937", // Réduit de theme.colors.gray[800] à #1f2937
  margin: `0 0 12px 0`, // Réduit de theme.spacing.sm à 12px
  lineHeight: "1.3", // Réduit de theme.font.lineHeight.tight à 1.3
};

const styleCongratulationsTitle: CSSProperties = {
  fontSize: "20px", // Réduit de theme.font.size["2xl"] à 20px
  fontWeight: "bold", // Réduit de theme.font.weight.bold à bold
  color: "#059669", // Réduit de theme.colors.success à #059669
  margin: `0 0 15px 0`, // Réduit de theme.spacing.md à 15px
  lineHeight: "1.3", // Réduit de theme.font.lineHeight.tight à 1.3
  textAlign: "center",
};

const stylePublishedMessage: CSSProperties = {
  fontSize: "14px", // Réduit de theme.font.size.lg à 14px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#374151", // Réduit de theme.colors.gray[700] à #374151
  margin: `0 0 20px 0`, // Réduit de theme.spacing.lg à 20px
  lineHeight: "1.5", // Réduit de theme.font.lineHeight.relaxed à 1.5
  textAlign: "center",
};

const stylePropertyImage: CSSProperties = {
  width: "100%",
  maxWidth: "350px", // Réduit de 400px à 350px
  height: "200px", // Réduit de 250px à 200px
  objectFit: "cover",
  borderRadius: "8px", // Réduit de theme.borderRadius.lg à 8px
  margin: `0 0 20px 0`, // Réduit de theme.spacing.lg à 20px
  border: `1px solid #d1d5db`, // Réduit de theme.colors.gray[300] à #d1d5db
};

const stylePropertyTitle: CSSProperties = {
  fontSize: "16px", // Réduit de theme.font.size.lg à 16px
  fontWeight: "bold", // Réduit de theme.font.weight.bold à bold
  color: "#111827", // Réduit de theme.colors.gray[900] à #111827
  margin: `0 0 8px 0`, // Réduit de theme.spacing.sm à 8px
  lineHeight: "1.3", // Réduit de theme.font.lineHeight.tight à 1.3
};

const stylePropertyLocation: CSSProperties = {
  fontSize: "13px", // Réduit de theme.font.size.base à 13px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#6b7280", // Réduit de theme.colors.gray[600] à #6b7280
  margin: `0 0 4px 0`, // Réduit de theme.spacing.xs à 4px
  lineHeight: "1.4", // Réduit de theme.font.lineHeight.normal à 1.4
};

const stylePropertyType: CSSProperties = {
  fontSize: "13px", // Réduit de theme.font.size.base à 13px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#6b7280", // Réduit de theme.colors.gray[600] à #6b7280
  margin: `0 0 4px 0`, // Réduit de theme.spacing.xs à 4px
  lineHeight: "1.4", // Réduit de theme.font.lineHeight.normal à 1.4
};

const stylePropertyArea: CSSProperties = {
  fontSize: "13px", // Réduit de theme.font.size.base à 13px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#6b7280", // Réduit de theme.colors.gray[600] à #6b7280
  margin: `0 0 4px 0`, // Réduit de theme.spacing.xs à 4px
  lineHeight: "1.4", // Réduit de theme.font.lineHeight.normal à 1.4
};

const stylePropertyPrice: CSSProperties = {
  fontSize: "16px", // Réduit de theme.font.size.lg à 16px
  fontWeight: "bold", // Réduit de theme.font.weight.bold à bold
  color: "#059669", // Réduit de theme.colors.success à #059669
  margin: `0 0 15px 0`, // Réduit de theme.spacing.md à 15px
  lineHeight: "1.4", // Réduit de theme.font.lineHeight.normal à 1.4
};

const stylePublicationInfo: CSSProperties = {
  fontSize: "12px", // Réduit de theme.font.size.base à 12px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#374151", // Réduit de theme.colors.gray[700] à #374151
  margin: `0 0 4px 0`, // Réduit de theme.spacing.xs à 4px
  lineHeight: "1.4", // Réduit de theme.font.lineHeight.normal à 1.4
};

const styleExpirationInfo: CSSProperties = {
  fontSize: "12px", // Réduit de theme.font.size.base à 12px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#d97706", // Réduit de theme.colors.warning à #d97706
  margin: `0 0 20px 0`, // Réduit de theme.spacing.lg à 20px
  lineHeight: "1.4", // Réduit de theme.font.lineHeight.normal à 1.4
};

const styleViewButton: CSSProperties = {
  backgroundColor: "#2563eb", // Réduit de theme.colors.primary à #2563eb
  borderRadius: "6px", // Réduit de theme.borderRadius.lg à 6px
  color: "#ffffff", // Réduit de theme.colors.white à #ffffff
  fontSize: "14px", // Réduit de theme.font.size.base à 14px
  fontWeight: "600", // Réduit de theme.font.weight.semibold à 600
  padding: "12px 20px", // Réduit de theme.spacing.sm theme.spacing.xl à 12px 20px
  textDecoration: "none",
  display: "inline-block",
  margin: "8px 0", // Réduit de theme.spacing.sm à 8px
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // Réduit de theme.shadow.md
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
};

const styleEditButton: CSSProperties = {
  backgroundColor: "#d97706", // Réduit de theme.colors.warning à #d97706
  borderRadius: "6px", // Réduit de theme.borderRadius.lg à 6px
  color: "#ffffff", // Réduit de theme.colors.white à #ffffff
  fontSize: "14px", // Réduit de theme.font.size.base à 14px
  fontWeight: "600", // Réduit de theme.font.weight.semibold à 600
  padding: "12px 20px", // Réduit de theme.spacing.sm theme.spacing.xl à 12px 20px
  textDecoration: "none",
  display: "inline-block",
  margin: "8px 0", // Réduit de theme.spacing.sm à 8px
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // Réduit de theme.shadow.md
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
};

const styleShareButton: CSSProperties = {
  backgroundColor: "#7c3aed", // Réduit de theme.colors.secondary à #7c3aed
  borderRadius: "6px", // Réduit de theme.borderRadius.lg à 6px
  color: "#ffffff", // Réduit de theme.colors.white à #ffffff
  fontSize: "14px", // Réduit de theme.font.size.base à 14px
  fontWeight: "600", // Réduit de theme.font.weight.semibold à 600
  padding: "12px 20px", // Réduit de theme.spacing.sm theme.spacing.xl à 12px 20px
  textDecoration: "none",
  display: "inline-block",
  margin: "8px 0", // Réduit de theme.spacing.sm à 8px
  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // Réduit de theme.shadow.md
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid #d1d5db`, // Réduit de theme.colors.gray[300] à #d1d5db
  margin: `20px 0`, // Réduit de theme.spacing.lg à 20px
};

const styleManagementTitle: CSSProperties = {
  fontSize: "16px", // Réduit de theme.font.size.lg à 16px
  fontWeight: "bold", // Réduit de theme.font.weight.bold à bold
  color: "#111827", // Réduit de theme.colors.gray[900] à #111827
  margin: `0 0 12px 0`, // Réduit de theme.spacing.md à 12px
  lineHeight: "1.3", // Réduit de theme.font.lineHeight.tight à 1.3
};

const styleManagementOptions: CSSProperties = {
  fontSize: "12px", // Réduit de theme.font.size.base à 12px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#374151", // Réduit de theme.colors.gray[700] à #374151
  margin: `0 0 20px 0`, // Réduit de theme.spacing.lg à 20px
  lineHeight: "1.5", // Réduit de theme.font.lineHeight.relaxed à 1.5
  backgroundColor: "#f9fafb", // Réduit de theme.colors.gray[100] à #f9fafb
  padding: "12px", // Réduit de theme.spacing.md à 12px
  borderRadius: "6px", // Réduit de theme.borderRadius.md à 6px
  border: `1px solid #e5e7eb`, // Réduit de theme.colors.gray[200] à #e5e7eb
};

const styleTipsTitle: CSSProperties = {
  fontSize: "16px", // Réduit de theme.font.size.lg à 16px
  fontWeight: "bold", // Réduit de theme.font.weight.bold à bold
  color: "#111827", // Réduit de theme.colors.gray[900] à #111827
  margin: `0 0 12px 0`, // Réduit de theme.spacing.md à 12px
  lineHeight: "1.3", // Réduit de theme.font.lineHeight.tight à 1.3
};

const styleTipsList: CSSProperties = {
  fontSize: "12px", // Réduit de theme.font.size.base à 12px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#374151", // Réduit de theme.colors.gray[700] à #374151
  margin: `0 0 20px 0`, // Réduit de theme.spacing.lg à 20px
  lineHeight: "1.5", // Réduit de theme.font.lineHeight.relaxed à 1.5
  backgroundColor: "#f9fafb", // Réduit de theme.colors.gray[100] à #f9fafb
  padding: "12px", // Réduit de theme.spacing.md à 12px
  borderRadius: "6px", // Réduit de theme.borderRadius.md à 6px
  border: `1px solid #e5e7eb`, // Réduit de theme.colors.gray[200] à #e5e7eb
};

const styleLinksTitle: CSSProperties = {
  fontSize: "16px", // Réduit de theme.font.size.lg à 16px
  fontWeight: "bold", // Réduit de theme.font.weight.bold à bold
  color: "#111827", // Réduit de theme.colors.gray[900] à #111827
  margin: `0 0 12px 0`, // Réduit de theme.spacing.md à 12px
  lineHeight: "1.3", // Réduit de theme.font.lineHeight.tight à 1.3
};

const styleLinksList: CSSProperties = {
  fontSize: "12px", // Réduit de theme.font.size.base à 12px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#374151", // Réduit de theme.colors.gray[700] à #374151
  margin: `0 0 20px 0`, // Réduit de theme.spacing.lg à 20px
  lineHeight: "1.5", // Réduit de theme.font.lineHeight.relaxed à 1.5
  backgroundColor: "#f9fafb", // Réduit de theme.colors.gray[100] à #f9fafb
  padding: "12px", // Réduit de theme.spacing.md à 12px
  borderRadius: "6px", // Réduit de theme.borderRadius.md à 6px
  border: `1px solid #e5e7eb`, // Réduit de theme.colors.gray[200] à #e5e7eb
};

const styleLinkItem: CSSProperties = {
  color: "#2563eb", // Réduit de theme.colors.primary à #2563eb
  textDecoration: "none",
  fontWeight: "500",
  display: "block",
  margin: "4px 0", // Réduit de theme.spacing.xs à 4px
};

const styleStatsTitle: CSSProperties = {
  fontSize: "16px", // Réduit de theme.font.size.lg à 16px
  fontWeight: "bold", // Réduit de theme.font.weight.bold à bold
  color: "#111827", // Réduit de theme.colors.gray[900] à #111827
  margin: `0 0 12px 0`, // Réduit de theme.spacing.md à 12px
  lineHeight: "1.3", // Réduit de theme.font.lineHeight.tight à 1.3
};

const styleStatsInfo: CSSProperties = {
  fontSize: "12px", // Réduit de theme.font.size.base à 12px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#374151", // Réduit de theme.colors.gray[700] à #374151
  margin: `0 0 20px 0`, // Réduit de theme.spacing.lg à 20px
  lineHeight: "1.5", // Réduit de theme.font.lineHeight.relaxed à 1.5
  backgroundColor: "#f9fafb", // Réduit de theme.colors.gray[100] à #f9fafb
  padding: "12px", // Réduit de theme.spacing.md à 12px
  borderRadius: "6px", // Réduit de theme.borderRadius.md à 6px
  border: `1px solid #e5e7eb`, // Réduit de theme.colors.gray[200] à #e5e7eb
};

const styleSupportMessage: CSSProperties = {
  fontSize: "12px", // Réduit de theme.font.size.base à 12px
  fontWeight: "normal", // Réduit de theme.font.weight.normal à normal
  color: "#374151", // Réduit de theme.colors.gray[700] à #374151
  margin: `0 0 20px 0`, // Réduit de theme.spacing.lg à 20px
  lineHeight: "1.5", // Réduit de theme.font.lineHeight.relaxed à 1.5
  textAlign: "center",
  backgroundColor: "#fef3c7", // Réduit de theme.colors.warning à #fef3c7
  padding: "12px", // Réduit de theme.spacing.md à 12px
  borderRadius: "6px", // Réduit de theme.borderRadius.md à 6px
  border: `1px solid #fbbf24`, // Réduit de theme.colors.warning à #fbbf24
};

const styleClosingMessage: CSSProperties = {
  fontSize: "12px", // Réduit de theme.font.size.base à 12px
  fontWeight: "600", // Réduit de theme.font.weight.semibold à 600
  color: "#059669", // Réduit de theme.colors.success à #059669
  margin: "0",
  lineHeight: "1.4", // Réduit de theme.font.lineHeight.normal à 1.4
  textAlign: "center",
  backgroundColor: "#ecfdf5", // Réduit de theme.colors.success à #ecfdf5
  padding: "12px", // Réduit de theme.spacing.md à 12px
  borderRadius: "6px", // Réduit de theme.borderRadius.md à 6px
  border: `1px solid #10b981`, // Réduit de theme.colors.success à #10b981
};

const styleEmailLink: CSSProperties = {
  color: "#d97706", // Réduit de theme.colors.warning à #d97706
  textDecoration: "underline",
  fontWeight: "600",
}; 