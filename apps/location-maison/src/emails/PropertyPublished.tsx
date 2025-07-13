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
            <Text style={styleGreeting}>
              {texts.greeting} {name} ! 🎉
            </Text>
            <Text style={styleCongratulationsTitle}>
              {texts.congratulationsTitle}
            </Text>
            <Text style={stylePublishedMessage}>
              {texts.publishedMessage}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Image de la propriété */}
      {property.imageUrl && (
        <Section>
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
            <Text style={stylePropertyTitle}>
              {property.title}
            </Text>
            <Text style={stylePropertyLocation}>
              📍 {property.location}
            </Text>
            <Text style={stylePropertyType}>
              🏠 {property.type}
            </Text>
            {property.area && (
              <Text style={stylePropertyArea}>
                📐 {property.area} m²
              </Text>
            )}
            <Text style={stylePropertyPrice}>
              💰 {formatPrice(property.price)}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Informations de publication */}
      <Section>
        <Row>
          <Column>
            <Text style={stylePublicationInfo}>
              📅 <strong>Publiée le :</strong> {formatDate(property.publishedAt)}
            </Text>
            <Text style={styleExpirationInfo}>
              ⏰ <strong>Expire le :</strong> {formatDate(property.expiresAt)}
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Boutons d'action */}
      <Section>
        <Row>
          <Column align="center">
            <Button
              href={`${texts.websiteUrl}/houseDetails/${property.id}`}
              style={styleViewButton}
            >
              {texts.viewButtonText}
            </Button>
          </Column>
        </Row>
      </Section>

      <Section>
        <Row>
          <Column align="center">
            <Button
              href={`${texts.websiteUrl}/property/modify/${property.id}`}
              style={styleEditButton}
            >
              {texts.editButtonText}
            </Button>
          </Column>
        </Row>
      </Section>

      <Section>
        <Row>
          <Column align="center">
            <Button
              href={`${texts.websiteUrl}/houseDetails/${property.id}?share=true`}
              style={styleShareButton}
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
            <Text style={styleManagementTitle}>
              {texts.managementTitle}
            </Text>
            <Text style={styleManagementOptions}>
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
            <Text style={styleTipsTitle}>
              {texts.tipsTitle}
            </Text>
            <Text style={styleTipsList}>
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
            <Text style={styleLinksTitle}>
              Liens utiles pour gérer votre annonce :
            </Text>
            <Text style={styleLinksList}>
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
            <Text style={styleStatsTitle}>
              📊 Suivez les performances de votre annonce :
            </Text>
            <Text style={styleStatsInfo}>
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
            <Text style={styleSupportMessage}>
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
            <Text style={styleClosingMessage}>
              Merci de faire confiance à Trouve Ton Nkama pour votre annonce immobilière ! 🏡
            </Text>
          </Column>
        </Row>
      </Section>
    </Layout>
  );
};

export default PropertyPublished;

// Styles CSS
const styleGreeting: CSSProperties = {
  fontSize: theme.font.size.lg,
  fontWeight: theme.font.weight.medium,
  color: theme.colors.gray[800],
  margin: `0 0 ${theme.spacing.sm}`,
  lineHeight: theme.font.lineHeight.tight,
};

const styleCongratulationsTitle: CSSProperties = {
  fontSize: theme.font.size["2xl"],
  fontWeight: theme.font.weight.bold,
  color: theme.colors.success,
  margin: `0 0 ${theme.spacing.md}`,
  lineHeight: theme.font.lineHeight.tight,
  textAlign: "center",
};

const stylePublishedMessage: CSSProperties = {
  fontSize: theme.font.size.lg,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[700],
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.relaxed,
  textAlign: "center",
};

const stylePropertyImage: CSSProperties = {
  width: "100%",
  maxWidth: "400px",
  height: "250px",
  objectFit: "cover",
  borderRadius: theme.borderRadius.lg,
  margin: `0 0 ${theme.spacing.lg}`,
  border: `1px solid ${theme.colors.gray[300]}`,
};

const stylePropertyTitle: CSSProperties = {
  fontSize: theme.font.size.lg,
  fontWeight: theme.font.weight.bold,
  color: theme.colors.gray[900],
  margin: `0 0 ${theme.spacing.sm}`,
  lineHeight: theme.font.lineHeight.tight,
};

const stylePropertyLocation: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[600],
  margin: `0 0 ${theme.spacing.xs}`,
  lineHeight: theme.font.lineHeight.normal,
};

const stylePropertyType: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[600],
  margin: `0 0 ${theme.spacing.xs}`,
  lineHeight: theme.font.lineHeight.normal,
};

const stylePropertyArea: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[600],
  margin: `0 0 ${theme.spacing.xs}`,
  lineHeight: theme.font.lineHeight.normal,
};

const stylePropertyPrice: CSSProperties = {
  fontSize: theme.font.size.lg,
  fontWeight: theme.font.weight.bold,
  color: theme.colors.success,
  margin: `0 0 ${theme.spacing.md}`,
  lineHeight: theme.font.lineHeight.normal,
};

const stylePublicationInfo: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[700],
  margin: `0 0 ${theme.spacing.xs}`,
  lineHeight: theme.font.lineHeight.normal,
};

const styleExpirationInfo: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.warning,
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.normal,
};

const styleViewButton: CSSProperties = {
  backgroundColor: theme.colors.primary,
  borderRadius: theme.borderRadius.lg,
  color: theme.colors.white,
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.semibold,
  padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
  textDecoration: "none",
  display: "inline-block",
  margin: `${theme.spacing.sm} 0`,
  boxShadow: theme.shadow.md,
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
};

const styleEditButton: CSSProperties = {
  backgroundColor: theme.colors.warning,
  borderRadius: theme.borderRadius.lg,
  color: theme.colors.white,
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.semibold,
  padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
  textDecoration: "none",
  display: "inline-block",
  margin: `${theme.spacing.sm} 0`,
  boxShadow: theme.shadow.md,
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
};

const styleShareButton: CSSProperties = {
  backgroundColor: theme.colors.secondary,
  borderRadius: theme.borderRadius.lg,
  color: theme.colors.white,
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.semibold,
  padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
  textDecoration: "none",
  display: "inline-block",
  margin: `${theme.spacing.sm} 0`,
  boxShadow: theme.shadow.md,
  border: "none",
  cursor: "pointer",
  transition: "all 0.2s ease-in-out",
};

const styleHr: CSSProperties = {
  border: "none",
  borderTop: `1px solid ${theme.colors.gray[300]}`,
  margin: `${theme.spacing.lg} 0`,
};

const styleManagementTitle: CSSProperties = {
  fontSize: theme.font.size.lg,
  fontWeight: theme.font.weight.bold,
  color: theme.colors.gray[900],
  margin: `0 0 ${theme.spacing.md}`,
  lineHeight: theme.font.lineHeight.tight,
};

const styleManagementOptions: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[700],
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.relaxed,
  backgroundColor: theme.colors.gray[100],
  padding: theme.spacing.md,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.gray[200]}`,
};

const styleTipsTitle: CSSProperties = {
  fontSize: theme.font.size.lg,
  fontWeight: theme.font.weight.bold,
  color: theme.colors.gray[900],
  margin: `0 0 ${theme.spacing.md}`,
  lineHeight: theme.font.lineHeight.tight,
};

const styleTipsList: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[700],
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.relaxed,
  backgroundColor: "#FFF8E1",
  padding: theme.spacing.md,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.warning}`,
};

const styleLinksTitle: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.semibold,
  color: theme.colors.gray[800],
  margin: `0 0 ${theme.spacing.sm}`,
  lineHeight: theme.font.lineHeight.normal,
};

const styleLinksList: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[700],
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.relaxed,
};

const styleLinkItem: CSSProperties = {
  color: theme.colors.primary,
  textDecoration: "none",
  fontWeight: theme.font.weight.medium,
  display: "inline-block",
  margin: `${theme.spacing.xs} 0`,
};

const styleStatsTitle: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.semibold,
  color: theme.colors.gray[800],
  margin: `0 0 ${theme.spacing.sm}`,
  lineHeight: theme.font.lineHeight.normal,
};

const styleStatsInfo: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[700],
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.relaxed,
  backgroundColor: "#E3F2FD",
  padding: theme.spacing.md,
  borderRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.info}`,
};

const styleSupportMessage: CSSProperties = {
  fontSize: theme.font.size.base,
  fontWeight: theme.font.weight.normal,
  color: theme.colors.gray[600],
  margin: `0 0 ${theme.spacing.lg}`,
  lineHeight: theme.font.lineHeight.relaxed,
  textAlign: "center",
};

const styleEmailLink: CSSProperties = {
  color: theme.colors.primary,
  textDecoration: "none",
  fontWeight: theme.font.weight.medium,
};

const styleClosingMessage: CSSProperties = {
  fontSize: theme.font.size.lg,
  fontWeight: theme.font.weight.bold,
  color: theme.colors.primary,
  margin: "0",
  lineHeight: theme.font.lineHeight.tight,
  textAlign: "center",
}; 