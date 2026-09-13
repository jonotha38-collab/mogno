/**
 * Catálogo Inicial do Mogno Brechó
 * ---------------------------------------------------------------------
 * O Mogno não é um brechó de dono só — é o garimpo de uma universitária
 * de Aracaju que visita brechós, feiras e bazares por toda a cidade
 * (Centro, Atalaia, Jardins, Farolândia, Coqueiral...) em busca de peças
 * com alma. Por isso cada item guarda também onde foi encontrado (`source`).
 *
 * Estado de conservação (`condition`) segue 4 níveis, sempre honestos:
 *   Impecável > Como Novo > Reformado > Avarias
 * ---------------------------------------------------------------------
 */

const DEFAULT_PRODUCTS = [
  {
    id: "mg-01",
    title: "Vestido Midi em Puro Linho Cru",
    category: "vestidos",
    brand: "Osklen Vintage",
    size: "M",
    material: "100% Linho Italiano",
    condition: "Como Novo",
    source: "Brechó do Bairro Jardins",
    price: 240.00,
    originalPrice: 680.00,
    status: "disponivel", // 'disponivel' | 'vendido'
    badge: "100% Linho",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=80",
    description: "Vestido midi confeccionado em puro linho encorpado, tingimento natural cru. Possui fendas laterais sutis e caimento fluído perfeito para tardes de brisa à beira-mar ou almoços casuais.",
    measurements: "Busto: 94cm | Cintura: 78cm | Comprimento: 122cm",
    vibe: "Praia & Pôr do Sol"
  },
  {
    id: "mg-02",
    title: "Camisa Oversized Terracota Solar",
    category: "camisas",
    brand: "Farm Rio Acervo",
    size: "G",
    material: "Linho Misto com Viscose",
    condition: "Impecável",
    source: "Feira da Zeza - Centro",
    price: 165.00,
    originalPrice: 420.00,
    status: "disponivel",
    badge: "Peça Única",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80",
    description: "Camisa de corte amplo e botões em madrepérola natural. Tom terracota/manga solar que ilumina a pele. Pode ser usada aberta como sobreposição na praia ou fechada com alfaiataria.",
    measurements: "Tórax: 112cm | Manga: 62cm | Comprimento: 76cm",
    vibe: "Tons Mogno & Verão"
  },
  {
    id: "mg-03",
    title: "Conjunto Alfaiataria Areia Costeira",
    category: "alfaiataria",
    brand: "Zara Woman Vintage 90s",
    size: "P",
    material: "Sarja de Algodão & Linho",
    condition: "Impecável",
    source: "Brechó Coqueiral",
    price: 290.00,
    originalPrice: 790.00,
    status: "disponivel",
    badge: "Vintage 90s",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80",
    description: "Conjunto icônico dos anos 90 composto por blazer cropped e bermuda de alfaiataria em tom areia dourada. Uma relíquia impecavelmente preservada da moda contemporânea atemporal.",
    measurements: "Ombro a ombro: 39cm | Cintura da bermuda: 70cm",
    vibe: "Elegância Minimalista"
  },
  {
    id: "mg-04",
    title: "Bolsa Artesanal em Palha de Buriti & Couro",
    category: "acessorios",
    brand: "Curadoria Artesanal Bahiana",
    size: "Único",
    material: "Palha Natural & Couro Ecológico",
    condition: "Impecável",
    source: "Bazar Solidário - Farolândia",
    price: 135.00,
    originalPrice: 310.00,
    status: "disponivel",
    badge: "Artesanato Local",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=80",
    description: "Trama manual trançada por artesãs litorâneas, alça reforçada em couro legítimo vegetal. Chegou com etiqueta original ainda presa — nunca foi usada. O acessório definitivo para transportar essenciais com leveza praiana e sofisticação.",
    measurements: "Largura: 32cm | Altura: 28cm | Profundidade: 12cm",
    vibe: "Natural & Orgânico"
  },
  {
    id: "mg-05",
    title: "Calça Pantalona Fluída Sálvia & Oliva",
    category: "alfaiataria",
    brand: "Cantão Vintage",
    size: "M",
    material: "Viscolinho Sustentável",
    condition: "Impecável",
    source: "Brechó Universitário - Cidade Nova",
    price: 180.00,
    originalPrice: 460.00,
    status: "disponivel",
    badge: "Toque de Seda",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
    description: "Pantalona com cintura alta estruturada e pregas frontais que criam um movimento escultural. Tom verde sálvia botânico que remete a vegetações de dunas e restinga costeira.",
    measurements: "Cintura: 74cm | Quadril: 104cm | Gancho: 34cm | Comprimento: 108cm",
    vibe: "Natureza & Dunas"
  },
  {
    id: "mg-06",
    title: "Quimono Estampado Botânica Sunset",
    category: "praia",
    brand: "Le Lis Blanc Acervo",
    size: "Único",
    material: "Chiffon de Seda Mista",
    condition: "Como Novo",
    source: "Feira de Antiguidades - Praça Fausto Cardoso",
    price: 195.00,
    originalPrice: 580.00,
    status: "disponivel",
    badge: "Edição Limitada",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
    description: "Quimono fluído com estamparia floral orgânica e folhas tropicais sobre fundo pêssego e manga. Caimento leve como brisa, ideal como saída de praia chic ou sobreposição noturna.",
    measurements: "Veste do 36 ao 44 com conforto fluído",
    vibe: "Balneário Chic"
  },
  {
    id: "mg-07",
    title: "Saia Pareô Transpassada em Linho Âmbar",
    category: "vestidos",
    brand: "Animale Vintage",
    size: "P",
    material: "100% Linho com Tingimento Âmbar",
    condition: "Como Novo",
    source: "Brechó do Bairro Jardins",
    price: 155.00,
    originalPrice: 390.00,
    status: "vendido",
    badge: "Vendido",
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=1000&q=80",
    description: "Saia estilo envelope com amarração lateral orgânica. Cor âmbar mogno marcante com textura rústica e toque macio pré-lavado.",
    measurements: "Cintura ajustável | Comprimento: 88cm",
    vibe: "Tons Mogno & Sol"
  },
  {
    id: "mg-08",
    title: "Óculos Retrô Vintage Dourado & Âmbar",
    category: "acessorios",
    brand: "Garimpo Italiano 1994",
    size: "Único",
    material: "Armação em Acetato e Metal Dourado",
    condition: "Reformado",
    source: "Garagem Sale - Atalaia",
    price: 140.00,
    originalPrice: 450.00,
    status: "disponivel",
    badge: "Vintage Genuíno",
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80",
    description: "Óculos de sol autêntico anos 90 garimpado em Florença. Passou por reforço profissional na dobradiça antes de chegar até você — hoje abre e fecha perfeitamente. Lentes âmbar degradê com proteção UV400 completa e detalhes em filigrana dourada.",
    measurements: "Largura frontal: 14cm | Ponte: 1.8cm",
    vibe: "Retro Chic"
  },
  {
    id: "mg-09",
    title: "Blazer Alfaiataria Terracota Cropped",
    category: "alfaiataria",
    brand: "Achado de Brechó",
    size: "P",
    material: "Sarja Pesada de Algodão",
    condition: "Avarias",
    source: "Feira da Zeza - Centro",
    price: 95.00,
    originalPrice: 260.00,
    status: "disponivel",
    badge: "Preço Honesto",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80",
    description: "Blazer cropped de alfaiataria em terracota queimado, ombro estruturado e botões em resina. Transparência total: tem um pequeno reparo (quase invisível) no forro interno e uma leve descoloração na barra da manga esquerda — nada que atrapalhe o uso, só reduz bastante o preço.",
    measurements: "Ombro a ombro: 40cm | Comprimento: 48cm",
    vibe: "Elegância Minimalista"
  }
];

// Presets rápidos para o admin cadastrar novas peças facilmente
const ADMIN_IMAGE_PRESETS = [
  { name: "Vestido Linho Areia", url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1000&q=80" },
  { name: "Camisa Bege Praia", url: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=80" },
  { name: "Vestido Floral Tropical", url: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80" },
  { name: "Bolsa Macramê / Praia", url: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=1000&q=80" },
  { name: "Alfaiataria Terracota", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80" },
  { name: "Top Cropped Artesanal", url: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=80" },
  { name: "Sandália de Couro Artesanal", url: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=1000&q=80" }
];

// Sugestões de "garimpado em" pra facilitar o cadastro no painel admin
const SOURCE_PRESETS = [
  "Brechó do Bairro Jardins",
  "Feira da Zeza - Centro",
  "Brechó Coqueiral",
  "Garagem Sale - Atalaia",
  "Brechó Universitário - Cidade Nova",
  "Feira de Antiguidades - Praça Fausto Cardoso",
  "Bazar Solidário - Farolândia"
];
