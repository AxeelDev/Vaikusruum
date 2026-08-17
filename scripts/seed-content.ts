import { createClient } from "@supabase/supabase-js";
import { DEFAULT_THEME } from "../src/lib/theme/theme";
import { SEED_IDS } from "../src/lib/content/ids";
import { bulletList, paragraphWithItalics, paragraphs, richDoc } from "../src/lib/content/rich-text";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

const supabase = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { pages: P, offerings: O } = SEED_IDS;

const HERO_INTRO = `Vaikusruum on kutse aeglustuda,
hingata ja olla.
Joogalik lähenemine loob võimaluse kuulata iseennast ja
oma keha ning leida vaikuse ja tasakaalu paik
enda sees.`;

const MIINA_INTRO = `Tere! Minu nimi on Miina.

Olen muusik ja joogaõpetaja.

Vahel on muusika see, mis puudutab kõige sügavamalt. Vahel teeb seda vaikus. Mõlemal on oma koht. Kui mu päevad on sageli muusikast tulvil, siis jooga annab võimaluse tulla vaikusesse.

Kutsun Sindki kogema vaikuse ruumi enda sees.`;

const YOGA_TEXT =
  "Jooga ei tähenda ainult painutamist või lõputut rätsepistes istumist. See on lihtne harjutuste, hingamise ja meditatsiooni süsteem, mis aitab luua rohkem tasakaalu kehasse, meeltesse ja igapäevaellu. Juhendajana loon rahuliku ja turvalise keskkonna, kus on võimalik peatuda ja aeglustuda. Ruumi, kus keha võib lõdvestuda ja hingamine leida oma loomuliku rütmi. Minu tundides ei pea midagi saavutama ega kuhugi jõudma. Oluline ei ole sooritus, vaid kohalolu – kuulamine, tunnetamine ja lubamine. Eriline rõhk tundides on lõdvestusel. Selle süvendamiseks kasutan vahel ka õrna muusikat või aeg-ajalt Veenuse-gongi pehmeid helisid.";

const GONG_OPENING = [
  "Vahel vajame lihtsalt otsust, et võtta aeg puhkamiseks. Lihtsalt olla, mitte midagi saavutada ega lahendada. Lubada kehal ja meelel hetkeks aeglustuda.",
  "Õhtu algab rahulike joogalike liikumiste, pehmete venituste ja teadliku hingamisega, mis aitavad jätta päev selja taha ning tulla kohale. Seejärel juhatan sind sügavasse lõdvestusse, kus saad lihtsalt puhata ja lasta kehal-meelel taastuda.",
  "Lõõgastust saadavad Veenuse gongi pehmed helid, mille vibratsioonid toetavad närvisüsteemi rahunemist. Paljud kogevad pärast praktikat suuremat sisemist rahu, kergust ja selgust. Kui vajud hetkeks unne, on ka see täiesti loomulik – keha puhkab just nii, nagu tal parasjagu vaja on.",
  "Lõõgastumine, teadlik hingamine ja gongihelid loovad koos keskkonna, mis toetab parasümpaatilise närvisüsteemi aktiveerumist – organismi loomulikku puhke- ja taastumisseisundit. Sessioon ajaliselt ei ole pikk, kuid loob kergesti sügava lõdvestuse efekti.",
];

const VENUS_GONG = [
  "Veenuse gong on üks sümfooniliste gongide liikidest, mille kõla on mahe, rikkalik ja pika järelheliga. Võrreldes jõulisema kõlaga gongidega peetakse Veenuse gongi helipilti sageli pehmemaks ja voolavamaks.",
  "Helivibratsioonid ning nende pikk kõlakaar loovad keskkonna, mis aitab suunata tähelepanu argimõtetelt kehalistele aistingutele ja puhkeolekule. Koos teadliku hingamise ning juhendatud lõdvestusega toetab see närvisüsteemi rahunemist ning võib pakkuda sügava taastumise kogemust. Traditsiooniliselt seostatakse Veenuse gongi südamekeskuse, õrnuse ja armastuse energiaga.",
  "Olen selle gongi valinud just pehme ja sooja kõla tõttu. Tekib turvaline ruum puhkuseks ja taastumiseks.",
];

const MINUST = [
  "Joogat nuusutasin esmakordselt päris varakult, 15 aastaselt. Üsna otseselt oli see mitmeski mõttes seotud muusika ja viiuliõpingutega. Esiteks taastusin käte ülemängimise traumast ja joogapraktika oli selles teemas ideaalne toetus. Teine põhjus oli aga spirituaalsemat laadi. Kogesin ühel kontserdil orkestrandina esinedes midagi unustamatut. Oli hetk, kus äkitselt kõik, absoluutselt kõik tundus täiuslik. Aeg kadus, oli ainult puhas õndsus. See oli sügavalt kogu olemust raputav kogemus, mis senise taju maailmast korraks niiöelda peapeale keeras. Ja mõistagi, pani see edasi uurima, otsima, endasse vaatama.",
  "Muusika- ja Teatriakadeemia lõpetamise aastal 2016 otsustasin minna õppima kundalini jooga õpetajaks (International Karam Kriya School). Alustasin ka üsna varsti tundide andmist, muuhulgas oma kolleegidele ERSOs. Hiljem lisandus mitmeid täiendkoolitusi nagu rasedatejooga (2017, ) ja gongimäng (2018). Gongimäng on mind huvitanud just eelkõige sügava, taastava lõdvestuse võtmes. Olen teinud tuvust ka energeetiliste praktikatega nagu Reiki ja õppinud Vana-Egiptuse juurtega tervendussüsteemi Sekhem (Royal Golden Sekhem, Level 1-4, 2025). Hetkel arendan end Biosensoorse Psühholoogia Instituudis, Biosensoorsete spetsialistide ettevalmitusgrupis (alates jaanuarist 2026). Ja loomulikult - kõike seda käsikäes oma väga armastatud orkestritööga.",
];

async function upsert(table: string, rows: Record<string, unknown>[], onConflict: string) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  await upsert(
    "pages",
    [
      {
        id: P.avaleht,
        slug: "avaleht",
        title: "Avaleht",
        nav_label: "Avaleht",
        show_in_nav: true,
        nav_order: 1,
        is_published: true,
        seo_title: "Vaikusruum",
        seo_description: "Vaikusruum on kutse aeglustuda, hingata ja olla.",
      },
      {
        id: P.kundalini,
        slug: "kundalini-jooga",
        title: "Kundalini jooga",
        nav_label: "Kundalini jooga",
        show_in_nav: true,
        nav_order: 2,
        is_published: true,
        seo_title: "Kundalini jooga",
        seo_description: "Kundalini jooga on terviklik joogapraktika, mis ühendab liikumise, hingamise, meditatsiooni ja sügava lõdvestuse.",
      },
      {
        id: P.gong,
        slug: "pehme-jooga-ja-gong",
        title: "Pehme jooga ja gong",
        nav_label: "Pehme jooga ja gong",
        show_in_nav: true,
        nav_order: 3,
        is_published: true,
        seo_title: "Pehme jooga ja gong",
      },
      {
        id: P.minust,
        slug: "minust",
        title: "Minust",
        nav_label: "Minust",
        show_in_nav: true,
        nav_order: 4,
        is_published: true,
      },
      {
        id: P.kkk,
        slug: "joogatunni-kkk",
        title: "Joogatunni KKK",
        nav_label: "Joogatunni KKK",
        show_in_nav: true,
        nav_order: 5,
        is_published: true,
      },
      {
        id: P.heaTeada,
        slug: "hea-teada",
        title: "Hea teada",
        nav_label: "Hea teada",
        show_in_nav: true,
        nav_order: 6,
        is_published: true,
      },
      {
        id: P.tagasiside,
        slug: "tagasiside",
        title: "Tagasiside",
        nav_label: "Tagasiside",
        show_in_nav: false,
        nav_order: 8,
        is_published: false,
      },
      {
        id: P.kontakt,
        slug: "kontakt",
        title: "Kontakt",
        nav_label: "Kontakt",
        show_in_nav: true,
        nav_order: 7,
        is_published: true,
      },
    ],
    "id",
  );

  await upsert(
    "offerings",
    [
      {
        id: O.kundalini,
        slug: "kundalini-jooga",
        title: "Kundalini jooga",
        short_title: "Kundalini jooga",
        location_name: "Lauliku lasteaia saal",
        address: "Kivimäe 17, Tallinn",
        schedule_summary: "Kolmapäeviti 19:30–21:00",
        tasakaal: null,
        registration_mode: "form",
        registration_email: null,
        registration_url: null,
        active: true,
      },
      {
        id: O.gong,
        slug: "pehme-jooga-ja-gong",
        title: "Pehme jooga ja gong",
        short_title: "Pehme jooga ja gong",
        location_name: "Üksmaja Ladvaruum",
        address: "Valdeku 66, Tallinn",
        schedule_summary: "2 x kuus esmaspäeviti kell 19:00–20:30",
        tasakaal: null,
        registration_mode: "form",
        registration_email: null,
        registration_url: null,
        active: true,
      },
    ],
    "id",
  );

  const gongDates = [
    ["2026-09-28", "28.09"],
    ["2026-10-05", "5.10"],
    ["2026-10-19", "19.10"],
    ["2026-11-02", "2.11"],
    ["2026-11-23", "23.11"],
    ["2026-12-07", "7.12"],
  ];

  const eventRows = [
    {
      id: "c1000000-0000-4000-8000-000000000001",
      offering_id: O.kundalini,
      starts_at: "2026-09-16T19:30:00+03:00",
      ends_at: "2026-09-16T21:00:00+03:00",
      display_date: "16.09",
      sort_order: 0,
      active: true,
    },
    ...gongDates.map(([iso, display], i) => ({
      id: `c1000000-0000-4000-8000-${String(i + 2).padStart(12, "0")}`,
      offering_id: O.gong,
      starts_at: `${iso}T19:00:00+03:00`,
      ends_at: `${iso}T20:30:00+03:00`,
      display_date: display,
      sort_order: i,
      active: true,
    })),
  ];
  await upsert("events", eventRows, "id");

  const sections: Array<{
    page_id: string;
    section_key: string;
    section_type: string;
    sort_order: number;
    enabled: boolean;
    content: Record<string, unknown>;
    style: Record<string, unknown>;
  }> = [
    {
      page_id: P.avaleht,
      section_key: "hero",
      section_type: "hero",
      sort_order: 1,
      enabled: true,
      content: { intro: HERO_INTRO, showEmblem: true },
      style: { background: "warm", minHeight: "viewport", specks: true },
    },
    {
      page_id: P.avaleht,
      section_key: "miina",
      section_type: "split_media_text",
      sort_order: 2,
      enabled: true,
      content: { plain: MIINA_INTRO },
      style: { background: "main", layout: "image-left", specks: true, mobileOrder: "image-first" },
    },
    {
      page_id: P.avaleht,
      section_key: "yoga",
      section_type: "rich_text",
      sort_order: 3,
      enabled: true,
      content: { body: paragraphs(YOGA_TEXT) },
      style: { background: "soft", layout: "centered", specks: true },
    },
    {
      page_id: P.avaleht,
      section_key: "offerings",
      section_type: "offering_overview",
      sort_order: 4,
      enabled: true,
      content: { offeringIds: [O.kundalini, O.gong], moreInfoLabel: "rohkem infot" },
      style: { background: "main", layout: "text-only", specks: true },
    },
    {
      page_id: P.avaleht,
      section_key: "private",
      section_type: "private_lessons",
      sort_order: 5,
      enabled: true,
      content: { label: "Eratunnid kokkuleppel", actionLabel: "Võta ühendust" },
      style: { background: "warm", specks: true, minHeight: "compact" },
    },
    {
      page_id: P.avaleht,
      section_key: "contact",
      section_type: "contact",
      sort_order: 6,
      enabled: true,
      content: { heading: "VÕTA KONTAKTI" },
      style: { background: "warm", layout: "text-only", specks: true },
    },
    {
      page_id: P.kundalini,
      section_key: "what",
      section_type: "rich_text",
      sort_order: 1,
      enabled: true,
      content: {
        heading: "Mis on kundalini jooga?",
        body: paragraphs(
          "Kundalini jooga on terviklik joogapraktika, mis ühendab liikumise, hingamise, meditatsiooni ja sügava lõdvestuse.",
          "Nii nagu taim vajab kasvamiseks valgust, vett ja aega, vajab ka inimene vahel lihtsalt õigeid tingimusi, et taastada oma loomulik tasakaal. Kundalini jooga loob selleks vastava keskkonna.",
          "Regulaarne praktika aitab vähendada pingeid, toetab närvisüsteemi ning toob rohkem energiat, selgust ja sisemist rahu. Avardab sinu tajuspektrit ja teadlikkust. Harjutused sobivad nii algajatele kui ka neile, kellel on varasem joogakogemus.",
        ),
      },
      style: { background: "main", layout: "centered", specks: true },
    },
    {
      page_id: P.kundalini,
      section_key: "difference",
      section_type: "rich_text",
      sort_order: 2,
      enabled: true,
      content: {
        heading: "Mille poolest erineb kundalini jooga?",
        body: richDoc([
          paragraphWithItalics(
            "Kundalini jooga on väga vana joogatraditsioon, samal ajal tänapäeva inimesele praktiline. Tunnis kasutatakse mitmeid erinevaid jooga tahke: kindlas järjestuses harjutusi ehk *krijasid*, mida täiendavad teadlik hingamine (*pranayama*), meditatsioonid, mantrad ja sügav lõdvestus. See kombinatsioon muudab kundalini jooga täpseks, terviklikuks ja tõhusaks.",
          ),
          paragraphWithItalics(
            "Igal *kriyal* on oma eesmärk – näiteks toetada närvisüsteemi, tasakaalustada hormonaalsüsteemi, tugevdada keskendumisvõimet või suurendada elujõudu. Tunnid on mitmekesised ning ühendavad füüsilise liikumise sisemise teadlikkusega.",
          ),
          paragraphWithItalics(
            "Tunnis osalemiseks ei pea omama mingeid eelteadmisi, otseseid füüsilisi eeldusi ega vaimseid tõekspidamisi. Kõik harjutused on praktilised ning igaüks saab neid teha oma võimete piires.",
          ),
        ]),
      },
      style: { background: "soft", layout: "centered", specks: true },
    },
    {
      page_id: P.kundalini,
      section_key: "structure",
      section_type: "rich_text",
      sort_order: 3,
      enabled: true,
      content: {
        heading: "Tunni ülesehitus.",
        body: richDoc([
          bulletList([
            "Rahunemine, teadvustatud hingamine",
            "Sissehäälestumine",
            "Soojendavad harjutused",
            "*Kriya* (harjutusteseeria)",
            "Lõdvestus (vaikse muusika või gongihelide saatel)",
            "Meditatsioon",
            "Tunnist väljahäälestumine",
          ]),
        ]),
      },
      style: { background: "main", layout: "centered" },
    },
    {
      page_id: P.kundalini,
      section_key: "practical",
      section_type: "offering_practical_info",
      sort_order: 4,
      enabled: true,
      content: {
        offeringId: O.kundalini,
        scheduleText:
          "Tunnid toimuvad kolmapäeviti alates 16.septembrist kell 19:30-21:00.\n\nAsikoht: Lauliku lasteaia saal. Kivimäe 17. Tallinn",
        bring: "Kaasa võta: oma matt, pleed või suurem sall, veepudel.",
        clothing: "Selga mugavad riided.",
        headTeadaLink: true,
      },
      style: { background: "warm", specks: true },
    },
    {
      page_id: P.gong,
      section_key: "opening",
      section_type: "rich_text",
      sort_order: 1,
      enabled: true,
      content: { body: paragraphs(...GONG_OPENING) },
      style: { background: "main", layout: "centered", specks: true },
    },
    {
      page_id: P.gong,
      section_key: "venus",
      section_type: "rich_text",
      sort_order: 2,
      enabled: true,
      content: { heading: "Veenuse gong", body: paragraphs(...VENUS_GONG) },
      style: { background: "soft", layout: "centered", specks: true },
    },
    {
      page_id: P.gong,
      section_key: "structure",
      section_type: "rich_text",
      sort_order: 3,
      enabled: true,
      content: {
        heading: "Tunni ülesehitus.",
        body: richDoc([
          bulletList([
            "hingamise rahunemine",
            "rahulikud venitused või pehmed joogaharjutused",
            "juhendatud lõdvestus",
            "gong, mille ajal võid vabalt tukastada või sügavasse puhkeolekusse vajuda.",
          ]),
        ]),
      },
      style: { background: "main", layout: "centered" },
    },
    {
      page_id: P.gong,
      section_key: "practical",
      section_type: "offering_practical_info",
      sort_order: 4,
      enabled: true,
      content: {
        offeringId: O.gong,
        scheduleText: "Tunnid toimuvad 2x kuus esmapäeviti Üksmaja Ladvaruumis.\n\nKell 19:00-20:30",
        notes: "Kõik vajalik on kohapeal olemas. Võta kaasa ainult veepudel ja mugavad riided.",
        showDates: true,
      },
      style: { background: "warm", specks: true },
    },
    {
      page_id: P.minust,
      section_key: "bio",
      section_type: "rich_text",
      sort_order: 1,
      enabled: true,
      content: { body: paragraphs(...MINUST) },
      style: { background: "main", layout: "centered", specks: true },
    },
    {
      page_id: P.kkk,
      section_key: "faq",
      section_type: "faq",
      sort_order: 1,
      enabled: true,
      content: {
        items: [
          {
            question: "Mis siis, kui ma ei saa rätsepistes istuda?",
            answer:
              "See ei ole probleem. Paljusid harjutusi saab teha toolil istudes või kasutada tooli abivahendina. Vajadusel kohandame harjutusi vastavalt Sinu enesetundele ja võimalustele.",
          },
          {
            question: "Kas tund sobib algajale?",
            answer:
              "Jah. Tundi on oodatud nii algajad kui ka varasema joogakogemusega osalejad. Kõiki harjutusi saab teha oma tempos ning oluline ei ole täiuslik sooritus, vaid teadlik kohalolu.",
          },
          {
            question: "Kas tund sobib rasedatele?",
            answer:
              "Tegemist ei ole spetsiaalselt rasedatele mõeldud tunniga. Kui oled lapseootel, anna sellest mulle kindlasti enne tundi teada. Mõningaid harjutusi saab kohandada ning osa praktikast on võimalik siiski kaasa teha.",
          },
          {
            question: "Kui intensiivsed on kundalini jooga tunnid?",
            answer:
              "Tundide sisu võib olla erinev – mõni praktika on aktiivsem, mõni rahulikum. Kõiki harjutusi saab kohandada vastavalt oma enesetundele ning alati on lubatud teha pause.",
          },
          {
            question: "Kas ma võin tulla ka siis, kui olen väga väsinud või stressis?",
            answer:
              "Jah. Tegelikult just siis on joogatunnist sageli kõige rohkem kasu. Tee harjutusi oma võimete piires ja luba endal puhata siis, kui keha seda vajab.",
          },
        ],
      },
      style: { background: "main" },
    },
    {
      page_id: P.heaTeada,
      section_key: "notes",
      section_type: "important_info",
      sort_order: 1,
      enabled: true,
      content: {
        items: [
          "Grupitunnid on mõeldud alates 14. eluaastast.",
          "Kui Sul on krooniline haigus, hiljutine vigastus või operatsioon või mõni muu tervislik eripära, soovitan enne joogapraktikaga alustamist pidada nõu oma raviarstiga.",
          "Jooga toetab üldist heaolu, kuid ei asenda arsti määratud ravi.",
          "Kui oled rase, palun anna sellest mulle enne tundi kindlasti teada. Nii saan soovitada just Sulle sobivaid harjutuste variante. Tegemist ei ole otseselt rasedatele mõeldud tundidega.",
          "Harjutuste intensiivsus võib tundide lõikes varieeruda, kuid kõiki harjutusi on võimalik kohandada vastavalt oma enesetundele ja võimetele.",
        ],
      },
      style: { background: "main" },
    },
    {
      page_id: P.tagasiside,
      section_key: "list",
      section_type: "testimonials",
      sort_order: 1,
      enabled: true,
      content: { items: [] },
      style: { background: "main" },
    },
    {
      page_id: P.kontakt,
      section_key: "contact",
      section_type: "contact",
      sort_order: 1,
      enabled: true,
      content: { heading: "VÕTA KONTAKTI" },
      style: { background: "warm", specks: true },
    },
  ];

  for (const section of sections) {
    const { error } = await supabase.from("sections").upsert(section, { onConflict: "page_id,section_key" });
    if (error) throw new Error(`sections ${section.section_key}: ${error.message}`);
  }

  const { error: themeError } = await supabase
    .from("theme_settings")
    .upsert({ id: 1, tokens: DEFAULT_THEME }, { onConflict: "id" });
  if (themeError) throw new Error(themeError.message);

  const { error: settingsError } = await supabase.from("site_settings").upsert(
    {
      id: 1,
      site_name: "Vaikusruum",
      contact_email: null,
      contact_phone: null,
      default_registration_email: null,
      social: {},
      footer_text: "Vaikusruum",
    },
    { onConflict: "id" },
  );
  if (settingsError) throw new Error(settingsError.message);

  console.log("Seed complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exit(1);
});
