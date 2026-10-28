import docDeliveryNote from "@/assets/landing/scene/doc-delivery-note.webp";
import docInvoice from "@/assets/landing/scene/doc-invoice.webp";
import docSprayPlan from "@/assets/landing/scene/doc-spray-plan.webp";
import msgPhoneCall from "@/assets/landing/scene/msg-phone-call.webp";
import msgVoice from "@/assets/landing/scene/msg-voice.webp";
import msgWhatsapp from "@/assets/landing/scene/msg-whatsapp.webp";
import noteField from "@/assets/landing/scene/note-field.webp";
import noteNotebook from "@/assets/landing/scene/note-notebook.webp";
import photoCrates from "@/assets/landing/scene/photo-crates.webp";
import photoFarmerBack from "@/assets/landing/scene/photo-farmer-back.webp";
import photoFarmerPhone from "@/assets/landing/scene/photo-farmer-phone.webp";
import photoFarmhouse from "@/assets/landing/scene/photo-farmhouse.webp";
import photoGlovePhone from "@/assets/landing/scene/photo-glove-phone.webp";
import photoGrainTruck from "@/assets/landing/scene/photo-grain-truck.webp";
import photoSilos from "@/assets/landing/scene/photo-silos.webp";
import photoSoybeanSack from "@/assets/landing/scene/photo-soybean-sack.webp";
import photoTractor from "@/assets/landing/scene/photo-tractor.webp";
import softwareChecklist from "@/assets/landing/scene/software-checklist.webp";

/** Hero documents, in the same order as `landing.hero.docs`. */
export const HERO_DOCS = [docInvoice, docDeliveryNote, noteNotebook, noteField] as const;

export const SCENE = {
  docInvoice,
  docSprayPlan,
  msgPhoneCall,
  msgVoice,
  msgWhatsapp,
  photoCrates,
  photoFarmerBack,
  photoFarmerPhone,
  photoFarmhouse,
  photoGlovePhone,
  photoGrainTruck,
  photoSilos,
  photoSoybeanSack,
  photoTractor,
  softwareChecklist,
} as const;
