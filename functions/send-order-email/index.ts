import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
// import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderEmailRequest {
  orderData: {
    nom: string;
    email: string;
    telephone: string;
    entreprise?: string;
    adresse?: string;
    message?: string;
  };
  items: Array<{
    produit: {
      id: string;
      nom: string;
      categorie: string;
      description: string;
    };
    quantite: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderData, items }: OrderEmailRequest = await req.json();

    // Format items for email
    const itemsList = items
      .map((item) => `• ${item.produit.nom} - Quantité: ${item.quantite}`)
      .join("\n");

    const totalItems = items.reduce((total, item) => total + item.quantite, 0);

    const emailContent = `
      <h1>Nouvelle demande de devis - I3S Sécurité</h1>
      
      <h2>Informations client:</h2>
      <ul>
        <li><strong>Nom:</strong> ${orderData.nom}</li>
        <li><strong>Email:</strong> ${orderData.email}</li>
        <li><strong>Téléphone:</strong> ${orderData.telephone}</li>
        ${
          orderData.entreprise
            ? `<li><strong>Entreprise:</strong> ${orderData.entreprise}</li>`
            : ""
        }
        ${
          orderData.adresse
            ? `<li><strong>Adresse:</strong> ${orderData.adresse}</li>`
            : ""
        }
      </ul>

      <h2>Produits demandés:</h2>
      <pre>${itemsList}</pre>
      
      <p><strong>Total articles:</strong> ${totalItems}</p>
      
      ${
        orderData.message
          ? `
      <h2>Message du client:</h2>
      <p>${orderData.message}</p>
      `
          : ""
      }
      
      <hr>
      <p><em>Cette demande a été générée automatiquement depuis le site I3S Sécurité.</em></p>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "I3S Sécurité <onboarding@resend.dev>",
      to: ["contact@incendie3s.com", "zeroman@yopmail.com"], // Remplacez par votre vraie adresse
      subject: `Nouvelle demande de devis - ${orderData.nom}`,
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-order-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
