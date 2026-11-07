import { createAdminClient } from "@/lib/supabase/admin";

export interface GazetteArticle {
  id: string;
  articleNumber: string; // e.g. "Article 28" / "Ingingo ya 28"
  title: string;
  category: "priority" | "speed" | "overtaking" | "signs" | "signals" | "parking" | "penalties" | "general";
  language: "rw" | "en" | "fr" | "all";
  decreeRef: string; // e.g. "Iteka rya Perezida No 85/01 ryo kuwa 02/09/2002 / Presidential Order No 85/01"
  content: string;
  keyTakeaways: string[];
  updatedAt?: string;
}

export const SEED_GAZETTE_ARTICLES: GazetteArticle[] = [
  // 1. Right of Way at Intersections & Roundabouts (Kinyarwanda)
  {
    id: "rw-art-28",
    articleNumber: "Ingingo ya 28",
    title: "Uburenganzira bwo gutambuka mbere mu masangano n'amasangano azunguruka (Roundabouts)",
    category: "priority",
    language: "rw",
    decreeRef: "Iteka rya Perezida No 85/01 ryo kuwa 02/09/2002 rigenga umuhanda n'ubugenzuzi bwawo",
    content: `1. Buri muyobozi w'ikinyabiziga ugeze mu masangano agomba guha inzira ikinyabiziga giturutse mu ruhande rwe rw'iburyo, keretse iyo ikimenyetso cy'umuhanda kigaragaza ukundi.
2. Mu masangano azunguruka (rond-point) agaragazwa n'icyapa cy'integuza cyangwa icyapa cy'itegeko ry'amasangano azunguruka, umuyobozi wese winjira mu isangano agomba kurekera inzira ibinyabiziga bimaze kwinjira no kugendamo.
3. Ibinyabiziga bishamikiye ku butabazi bwihuse (imodoka z'ingoboka, iza polisi, n'izizimya umuriro) bifite uburenganzira bwo gutambuka mbere igihe byose bikoresha ibimenyetso by'amajwi n'amatara yabigenewe.`,
    keyTakeaways: [
      "Itegeko rusange: Guha inzira ibituruka iburyo (priorité à droite).",
      "Mu masangano azunguruka: Ibinyabiziga birimo imbere nibyo bifite uburenganzira mbere y'ibigiye kwinjiramo.",
      "Imodoka z'ubutabazi ziri ku murimo zifite uburenganzira ntakuka bwo gutambuka mbere."
    ]
  },
  // 2. Right of Way at Intersections & Roundabouts (English)
  {
    id: "en-art-28",
    articleNumber: "Article 28",
    title: "Priority and Right of Way at Intersections and Roundabouts",
    category: "priority",
    language: "en",
    decreeRef: "Presidential Order No 85/01 of 02/09/2002 Regulating General Police of Road Traffic",
    content: `1. Every driver approaching an intersection must give way to vehicles approaching from their right, unless otherwise indicated by road signs or road markings.
2. At roundabouts marked with roundabout signs (mandatory direction or priority signs), drivers entering the roundabout must yield the right of way to vehicles already circulating inside the roundabout.
3. Priority emergency vehicles (ambulances, police vehicles, and fire engines) have absolute right of way when operating authorized audible sirens and flashing warning beacons.`,
    keyTakeaways: [
      "General rule: Yield to vehicles coming from the right.",
      "At roundabouts: Circulating traffic inside the roundabout has priority over entering vehicles.",
      "Emergency vehicles with sirens and flashing lights have absolute priority."
    ]
  },
  // 3. Right of Way at Intersections & Roundabouts (French)
  {
    id: "fr-art-28",
    articleNumber: "Article 28",
    title: "Priorité de passage aux carrefours et aux ronds-points",
    category: "priority",
    language: "fr",
    decreeRef: "Arrêté Présidentiel No 85/01 du 02/09/2002 portant règlement général de la circulation routière",
    content: `1. Tout conducteur abordant un carrefour doit céder le passage aux véhicules venant de sa droite, à moins d'une signalisation contraire.
2. Aux ronds-points munis de panneaux de signalisation appropriés, les véhicules qui s'engagent doivent obligatoirement céder le passage aux véhicules déjà engagés dans le giratoire.
3. Les véhicules prioritaires en mission d'urgence (ambulances, pompiers, police) bénéficient de la priorité absolue dès lors qu'ils actionnent leurs avertisseurs sonores et lumineux réglementaires.`,
    keyTakeaways: [
      "Règle générale : Priorité à droite en l'absence de signalisation spécifique.",
      "Aux ronds-points : Priorité absolue aux véhicules circulant déjà sur l'anneau.",
      "Priorité absolue aux véhicules de secours en intervention d'urgence."
    ]
  },

  // 4. Speed Limits (Kinyarwanda)
  {
    id: "rw-art-33",
    articleNumber: "Ingingo ya 33",
    title: "Umuvuduko ntarengwa mu nsisiro no hanze y'insisiro",
    category: "speed",
    language: "rw",
    decreeRef: "Iteka rya Perezida No 85/01 n'amavugurura yaryo ku mutekano wo mu muhanda",
    content: `1. Mu nsisiro (mu migi n'ahatuwe): Umuvuduko ntarengwa w'ibinyabiziga bitwara abantu n'ibitwara imizigo nto ni kilometero 40 mu isaha (40 km/h), keretse icyapa cy'umuhanda cyerekanye ukundi.
2. Ahegereye amashuri n'ibitaro: Umuvuduko ntugomba kurenga 25 km/h cyangwa 30 km/h hakurikijwe ibyapa bihashyizwe.
3. Hanze y'insisiro (ku mihanda minini): Umuvuduko ntarengwa ku binyabiziga byoroshye ni kilometero 80 mu isaha (80 km/h) ku mihanda yabugenewe, naho amakamyo n'ibinyabiziga binini bikagendera ku muvuduko utarenga 60 km/h.`,
    keyTakeaways: [
      "Mu nsisiro / mu migi: Umuvuduko ntarengwa usanzwe ni 40 km/h.",
      "Ahegereye amashuri n'amavuriro: Umuvuduko ni hagati ya 25 na 30 km/h.",
      "Hanze y'insisiro: 80 km/h ku binyabiziga bisanzwe, 60 km/h ku modoka ziremereye."
    ]
  },
  // 5. Speed Limits (English)
  {
    id: "en-art-33",
    articleNumber: "Article 33",
    title: "Speed Limits Inside and Outside Built-Up Areas",
    category: "speed",
    language: "en",
    decreeRef: "Presidential Order No 85/01 Regulating General Police of Road Traffic in Rwanda",
    content: `1. Inside built-up areas (urban zones, towns, and residential sectors): The maximum speed limit is 40 km/h, unless higher or lower speed limits are explicitly posted by regulatory signs.
2. Near schools, hospitals, and high-pedestrian density zones: The speed limit is restricted to 25 km/h or 30 km/h as designated by school zone signage.
3. Outside built-up areas (highways and inter-city routes): The maximum speed limit is 80 km/h for passenger cars and light vehicles, and 60 km/h for heavy commercial trucks and buses.`,
    keyTakeaways: [
      "Urban / built-up areas: Standard speed limit is 40 km/h.",
      "School and hospital zones: Restricted to 25 km/h – 30 km/h.",
      "Highways / open road: 80 km/h for light vehicles, 60 km/h for heavy vehicles."
    ]
  },
  // 6. Speed Limits (French)
  {
    id: "fr-art-33",
    articleNumber: "Article 33",
    title: "Limites de vitesse en agglomération et hors agglomération",
    category: "speed",
    language: "fr",
    decreeRef: "Arrêté Présidentiel No 85/01 et modifications relatives à la police de circulation routière",
    content: `1. En agglomération (villes et zones résidentielles) : La vitesse maximale autorisée est fixée à 40 km/h, sauf indication contraire par panneaux de signalisation.
2. Aux abords des écoles et hôpitaux : La vitesse est limitée à 25 km/h ou 30 km/h selon la signalisation spécifique installée.
3. Hors agglomération : La vitesse est plafonnée à 80 km/h pour les véhicules légers et à 60 km/h pour les véhicules de transport lourd et autocars.`,
    keyTakeaways: [
      "En agglomération : Vitesse maximale standard de 40 km/h.",
      "Zones scolaires et hospitalières : Vitesse réduite à 25–30 km/h.",
      "Hors agglomération : 80 km/h pour véhicules légers, 60 km/h pour poids lourds."
    ]
  },

  // 7. Overtaking Rules & Prohibitions (Kinyarwanda)
  {
    id: "rw-art-20",
    articleNumber: "Ingingo ya 20",
    title: "Amategeko agenga kunyuranaho n'ahabujijwe kunyuranaho",
    category: "overtaking",
    language: "rw",
    decreeRef: "Iteka rya Perezida No 85/01 ryo kuwa 02/09/2002",
    content: `1. Kunyuranaho bikorwa binyuze mu ruhande rw'ibumoso bw'ikinyabiziga kinyurwaho.
2. Birabujijwe kunyuranaho:
   a) Ahegereye impinga y'umusozi cyangwa mu makorosi aho ibinyabiziga bituruka imbere bitaboneka neza;
   b) Ahegereye cyangwa ku masangano n'inzira z'abanyamaguru (passage pour piétons);
   c) Aho umurongo wera udatsembye (ligne blanche continue) ugaragara mu muhanda;
   d) Igihe ikinyabiziga kigukurikiye kimaze gutangira kugunyuraho;
   e) Ku madirishya cyangwa inzira z'amazi n'ahafunganye.`,
    keyTakeaways: [
      "Kunyuranaho bikorwa ibumoso gusa.",
      "Birabujijwe kunyuraho ku murongo udatsembye, mu makorosi, ku mpinga, no ku masangano y'abanyamaguru.",
      "Kureba mu ndorerwamo no gutanga ikimenyetso cy'itara mbere yo kunyuraho ni itegeko."
    ]
  },
  // 8. Overtaking Rules & Prohibitions (English)
  {
    id: "en-art-20",
    articleNumber: "Article 20",
    title: "Rules and Prohibitions on Overtaking",
    category: "overtaking",
    language: "en",
    decreeRef: "Presidential Order No 85/01 of 02/09/2002",
    content: `1. Overtaking must strictly be executed on the left side of the vehicle being overtaken.
2. Overtaking is strictly prohibited:
   a) Near the crest of a hill or in curves where forward visibility is insufficient;
   b) Immediately preceding or on pedestrian crossings;
   c) Where a continuous solid white line divides traffic lanes;
   d) When a following vehicle has already commenced overtaking;
   e) On narrow bridges and road bottlenecks.`,
    keyTakeaways: [
      "Always overtake on the left.",
      "Never overtake on solid continuous white lines, blind crests, or pedestrian crosswalks.",
      "Mandatory to check mirrors and signal intention with indicators before moving out."
    ]
  },

  // 9. Road Signs Taxonomy (Kinyarwanda)
  {
    id: "rw-art-50",
    articleNumber: "Ingingo ya 50",
    title: "Ubwoko bw'ibyapa byo mu muhanda: Integuza, Ibibuzwa, n'Ibitegeka",
    category: "signs",
    language: "rw",
    decreeRef: "Iteka rya Perezida No 85/01 rigenga ubugenzuzi bw'umuhanda mu Rwanda",
    content: `1. Ibyapa by'integuza (Panneaux de danger): Bikunze kugira ishusho ya mpandeshatu ifite uruhande rw'umutuku n'imfuruka ireba hejuru. Bimenyesha umushoferi ibyago biri imbere (urugero: ikorosi rikaze, amashuri, amabuye agwa).
2. Ibyapa bibuza (Panneaux d'interdiction): Bikunze kugira ishusho y'uruziga rufite uruzitiro rutukura. Butegeka kureka igikorwa runaka (urugero: kubuza kunyuranaho, kubuza kwinjira, kubuza guhagarara).
3. Ibyapa bitegeka (Panneaux d'obligation): Bikunze kugira ishusho y'uruziga rw'ubururu bufite ibimenyetso by'umweru. Bitegeka icyo umushoferi agomba gukora (urugero: gutegeka gukata iburyo, inzira y'amagare gusa).
4. Ibyapa bimenyesha (Panneaux d'indication): Bikunze kugira ishusho y'urukiramende rw'ubururu cyangwa icyatsi bitanga amakuru y'aho ibintu biherereye.`,
    keyTakeaways: [
      "Mpandeshatu itukura = Icyapa cy'integuza (akaga kateganyijwe).",
      "Uruziga rutukura = Icyapa kibuza (ntiwemerewe).",
      "Uruziga rw'ubururu = Icyapa gitegeka (ugomba kubikora).",
      "Urukiramende = Icyapa kimenyesha (amakuru)."
    ]
  },
  // 10. Road Signs Taxonomy (English)
  {
    id: "en-art-50",
    articleNumber: "Article 50",
    title: "Categories of Road Signs: Warning, Regulatory, and Mandatory Signs",
    category: "signs",
    language: "en",
    decreeRef: "Presidential Order No 85/01 Regulating Road Traffic and Signs in Rwanda",
    content: `1. Danger Warning Signs: Triangular shaped with red borders and apex pointing upwards. They alert drivers of upcoming roadway hazards (sharp bends, school crossings, falling rocks).
2. Prohibitory Signs: Circular shaped with red circular borders. They forbid specific maneuvers or access (no overtaking, no entry, no parking, speed limit).
3. Mandatory Signs: Circular shaped with blue backgrounds and white symbols. They mandate an obligation that drivers must obey (turn right only, minimum speed, bus lane only).
4. Informative and Guidance Signs: Rectangular or square with blue/green backgrounds, providing general routing and facility info.`,
    keyTakeaways: [
      "Red triangle = Warning sign (hazard ahead).",
      "Red circle = Prohibitory sign (forbidden action).",
      "Blue circle = Mandatory sign (compulsory instruction).",
      "Blue/Green rectangle = Information sign."
    ]
  },

  // 11. Alcohol, Impairment & Traffic Penalties (Kinyarwanda)
  {
    id: "rw-art-85",
    articleNumber: "Ingingo ya 85",
    title: "Gutwara wasinze cyangwa wanyoye ibisindisha n'ibihano bijyanye nabyo",
    category: "penalties",
    language: "rw",
    decreeRef: "Amategeko ya Polisi y'u Rwanda agenga umutekano wo mu muhanda n'ibihano",
    content: `1. Birabujijwe cyane gutwara ikinyabiziga umuyobozi yanyoye ibisindisha birengeje urugero rwemewe n'amategeko (0.00% kugeza 0.08% hakurikijwe ubugenzuzi bwa 'breathalyzer').
2. Ibihano byo gutwara wasinze birimo:
   - Ihazabu y'amafaranga y'u Rwanda ibihumbi 150 (150,000 RWF);
   - Gufungirwa kugeza igihe umusemburo ushiriye mu mubiri;
   - Gufatira ikinyabiziga;
   - Guhagarikirwa uruhushya rwo gutwara ibinyabiziga igihe cyose bitegetswe n'urukiko.`,
    keyTakeaways: [
      "Kunywa inzoga no gutwara birabujijwe burundu.",
      "Ihazabu y'ibanze yagenwe ni 150,000 RWF hamwe no gufunga ikinyabiziga.",
      "Kuruhushya rushobora guhagarikwa cyangwa kwamburwa burundu."
    ]
  },
  // 12. Alcohol, Impairment & Traffic Penalties (English)
  {
    id: "en-art-85",
    articleNumber: "Article 85",
    title: "Driving Under the Influence of Alcohol and Associated Legal Penalties",
    category: "penalties",
    language: "en",
    decreeRef: "Rwanda National Police Road Safety Regulations and Penal Code Decrees",
    content: `1. Driving a motor vehicle under the influence of alcohol, narcotics, or psychotropic substances is strictly prohibited under Rwandan law.
2. Blood and breath alcohol concentration testing by law enforcement officers using approved breathalyzer devices is compulsory upon request.
3. Penalties include:
   - Standard fine of 150,000 RWF;
   - Police detention until complete sobriety;
   - Vehicle impoundment;
   - Potential suspension or permanent revocation of driver's license for repeat offenses.`,
    keyTakeaways: [
      "Zero tolerance for drink driving in Rwanda.",
      "Standard fine is 150,000 RWF plus mandatory vehicle impoundment.",
      "Refusing a breathalyzer test incurs equivalent penalties."
    ]
  }
];

const CONFIG_KEY = "official_gazette_articles";

let memoryCachedArticles: GazetteArticle[] | null = null;
let lastCacheTime = 0;

/**
 * Fetch all Gazette articles (combining default seed articles with any admin-uploaded custom articles).
 */
export async function getGazetteArticles(): Promise<GazetteArticle[]> {
  const nowMs = Date.now();
  if (memoryCachedArticles && nowMs - lastCacheTime < 60000) {
    return memoryCachedArticles;
  }

  try {
    const adminSb = createAdminClient();
    const { data } = await adminSb
      .from("system_config")
      .select("value")
      .eq("key", CONFIG_KEY)
      .maybeSingle();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge custom with seed (deduplicating by ID)
          const map = new Map<string, GazetteArticle>();
          for (const a of SEED_GAZETTE_ARTICLES) {
            map.set(a.id, a);
          }
          for (const a of parsed) {
            map.set(a.id, a);
          }
          const result = Array.from(map.values());
          memoryCachedArticles = result;
          lastCacheTime = nowMs;
          return result;
        }
      } catch {}
    }
  } catch (error) {
    console.error("Error reading gazette articles from system_config:", error);
  }

  memoryCachedArticles = SEED_GAZETTE_ARTICLES;
  lastCacheTime = nowMs;
  return SEED_GAZETTE_ARTICLES;
}

/**
 * Save / update gazette articles in system_config.
 */
export async function saveGazetteArticles(articles: GazetteArticle[]): Promise<boolean> {
  memoryCachedArticles = articles;
  lastCacheTime = Date.now();
  try {
    const adminSb = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await adminSb
      .from("system_config")
      .upsert(
        {
          key: CONFIG_KEY,
          value: JSON.stringify(articles),
          description: "Official Gazette of Rwanda Traffic Code articles and legal references",
          updated_at: now,
        },
        { onConflict: "key" }
      );

    if (error) {
      console.error("Failed to save gazette articles:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception saving gazette articles:", err);
    return false;
  }
}
