import { routes } from "@/constantes/routes";

export default function DataDeletionPage() {
  return (
    <section className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white shadow-md rounded-lg p-8 max-w-3xl w-full text-gray-800">
        <h1 className="text-3xl font-extrabold mb-6 text-center text-gray-900">
          Suppression des Données
        </h1>
        <p className="mb-4">
          Conformément à la politique de protection des données, vous avez le droit de demander la suppression de vos données personnelles associées à votre compte.
        </p>
        <p className="mb-4">
          Si vous souhaitez supprimer vos données de notre plateforme, veuillez nous contacter par email à l'adresse suivante :
          <strong> {process.env.NEXT_PUBLIC_EMAIL_SUPPORT}</strong> en mentionnant l'objet « Suppression de compte ». 
        </p>
        <p className="mb-4">
          Une fois votre demande reçue, nous traiterons la suppression de vos données dans un délai de 30 jours, conformément à nos conditions d'utilisation et notre politique de confidentialité.
        </p>
        <p>
          Pour plus d'informations, consultez notre{" "}
          <a href={routes.public.confidentiality} className="text-blue-600 underline">
            Politique de Confidentialité
          </a>.
        </p>
      </div>
    </section>
  );
}