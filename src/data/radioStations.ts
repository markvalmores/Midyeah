import { RadioStation } from "../types";

/**
 * Global Sync'd Radio Stations List
 * Total: 77 stations (High priority on Philippines 🇵🇭 and Japan 🇯🇵)
 */
export const RADIO_STATIONS: RadioStation[] = [
  // === PHILIPPINES 🇵🇭 === (35 stations)
  { id: "ph_love", name: "90.7 Love Radio Manila", genre: "OPM & Pop", streamUrl: "https://mbc-loveradio.streamguys1.com/loveradio", logo: "💝", country: "philippines" },
  { id: "ph_easy", name: "96.3 Easy Rock Manila", genre: "Lite Rock", streamUrl: "https://mbc-easyrock.streamguys1.com/easyrock", logo: "☕", country: "philippines" },
  { id: "ph_yes", name: "Yes The Best 101.1 FM", genre: "Pop & Trending", streamUrl: "https://mbc-yesfm.streamguys1.com/yesfm", logo: "💃", country: "philippines" },
  { id: "ph_wish", name: "Wish 107.5 FM Manila", genre: "Acoustic & Pop", streamUrl: "https://stream.zeno.fm/cv8u190zkheuv", logo: "🌸", country: "philippines" },
  { id: "ph_barangay", name: "Barangay LS 97.1 FM", genre: "Pop & Masa", streamUrl: "https://stream.zeno.fm/0mscq7nt3veuv", logo: "🎙️", country: "philippines" },
  { id: "ph_dzrh", name: "DZRH 666 AM News", genre: "News & Talk", streamUrl: "https://mbc-dzrh.streamguys1.com/dzrh", logo: "📰", country: "philippines" },
  { id: "ph_win", name: "91.5 Win Radio Manila", genre: "Pop & Masa", streamUrl: "https://stream.zeno.fm/f0vvyqqf4u8uv", logo: "🏆", country: "philippines" },
  { id: "ph_energy", name: "106.7 Energy FM Manila", genre: "Pop & Masa", streamUrl: "https://stream.zeno.fm/a7fscq7nt3veuv", logo: "⚡", country: "philippines" },
  { id: "ph_rx", name: "Monster RX 93.1", genre: "Contemporary Pop", streamUrl: "https://stream.zeno.fm/u8vkq7nt3veuv", logo: "👾", country: "philippines" },
  { id: "ph_mellow", name: "Mellow 94.7 FM", genre: "Soft AC", streamUrl: "https://stream.zeno.fm/hmrcq7nt3veuv", logo: "🍯", country: "philippines" },
  { id: "ph_star", name: "Star FM Manila", genre: "Pop & OPM", streamUrl: "https://stream.zeno.fm/8qscq7nt3veuv", logo: "⭐", country: "philippines" },
  { id: "ph_rjfm", name: "RJFM 100.3 FM", genre: "Classic Hits", streamUrl: "https://stream.zeno.fm/n0scq7nt3veuv", logo: "🎸", country: "philippines" },
  { id: "ph_wave", name: "Wave 89.1 FM", genre: "R&B & Hip Hop", streamUrl: "https://stream.zeno.fm/84scq7nt3veuv", logo: "🌊", country: "philippines" },
  { id: "ph_magic", name: "Magic 89.9 FM", genre: "Pop & Top 40", streamUrl: "https://stream.zeno.fm/k2vkq7nt3veuv", logo: "🪄", country: "philippines" },
  { id: "ph_klite", name: "K-Lite 103.5 FM", genre: "80s-2000s Pop", streamUrl: "https://stream.zeno.fm/v8vkq7nt3veuv", logo: "💿", country: "philippines" },
  { id: "ph_okfm", name: "OK FM 97.5 Manila", genre: "Pinoy Pop", streamUrl: "https://stream.zeno.fm/u8vkq7nt3veuu", logo: "👌", country: "philippines" },
  { id: "ph_pinas", name: "Pinas FM 95.5", genre: "OPM Only", streamUrl: "https://stream.zeno.fm/w8vkq7nt3veuu", logo: "🇵🇭", country: "philippines" },
  { id: "ph_boracay", name: "106.1 Boracay Beach", genre: "Lounge & Chill", streamUrl: "https://stream.zeno.fm/f8fcq7nt3veuv", logo: "🏖️", country: "philippines" },
  { id: "ph_cebu_love", name: "Love Radio Cebu", genre: "Visayan Hits", streamUrl: "https://stream.zeno.fm/4fscq7nt3veuv", logo: "🌊", country: "philippines" },
  { id: "ph_davao_mor", name: "MOR 101.1 Davao", genre: "Davao Hits", streamUrl: "https://stream.zeno.fm/3fscq7nt3veuv", logo: "🍈", country: "philippines" },
  { id: "ph_spirit", name: "Spirit FM 99.1", genre: "Catholic Radio", streamUrl: "https://stream.zeno.fm/8qscq7nt3veuu", logo: "🕊️", country: "philippines" },
  { id: "ph_dzbb", name: "Super Radyo DZBB", genre: "News & Talk", streamUrl: "https://stream.zeno.fm/dw2e24shs8uv", logo: "🏙️", country: "philippines" },
  { id: "ph_dzmm", name: "DZMM Teleradyo", genre: "News", streamUrl: "https://www.youtube.com/watch?v=QVPTp69f4Sw", youtubeVideoId: "QVPTp69f4Sw", logo: "📺", country: "philippines", isYoutube: true, youtubeChannelId: "UCv-mO10hZ0_RMT5_206B_07Yw" },
  { id: "ph_brgy_cebu", name: "Barangay RT Cebu", genre: "Visayan Pop", streamUrl: "https://stream.zeno.fm/2fscq7nt3veuv", logo: "🕺", country: "philippines" },
  { id: "ph_monster_cebu", name: "Monster Radio BT 105.9", genre: "Pop", streamUrl: "https://stream.zeno.fm/u8vkq7nt3veuv", logo: "👾", country: "philippines" },
  { id: "ph_energy_cebu", name: "Energy FM Cebu", genre: "Pop", streamUrl: "https://stream.zeno.fm/a7fscq7nt3veuv", logo: "⚡", country: "philippines" },
  { id: "ph_halo_halo", name: "Halo Halo Radio", genre: "OPM Mix", streamUrl: "https://stream.zeno.fm/6vtscq7nt3veuv", logo: "🍧", country: "philippines" },
  { id: "ph_tagabayan", name: "Radyo Natin Manila", genre: "Community", streamUrl: "https://stream.zeno.fm/0vtscq7nt3veuv", logo: "🌍", country: "philippines" },
  { id: "ph_brigada", name: "Brigada News FM", genre: "News/OPM", streamUrl: "https://stream.zeno.fm/7vtscq7nt3veuv", logo: "🚒", country: "philippines" },
  { id: "ph_v_rock", name: "V-Rock Radio PH", genre: "Rock", streamUrl: "https://stream.zeno.fm/n0scq7nt3veuv", logo: "🤟", country: "philippines" },
  { id: "ph_crossover", name: "Crossover Manila", genre: "Jazz/Smooth", streamUrl: "https://stream.zeno.fm/m8vkq7nt3veuv", logo: "🎺", country: "philippines" },
  { id: "ph_radyo5", name: "Radyo5 92.3 News FM", genre: "News", streamUrl: "https://stream.zeno.fm/g66twphwawzuv", logo: "📻", country: "philippines" },
  { id: "ph_i_fm", name: "iFM Manila 93.9", genre: "Pop/OPM", streamUrl: "https://stream.zeno.fm/8qscq7nt3veuv", logo: "🎈", country: "philippines" },
  { id: "ph_qfm", name: "QFM 101.3", genre: "Pop", streamUrl: "https://stream.zeno.fm/p8vkq7nt3veuv", logo: "🍡", country: "philippines" },
  { id: "ph_coolfm", name: "Cool FM 90.1", genre: "Easy", streamUrl: "https://stream.zeno.fm/w8vkq7nt3veuu", logo: "🍃", country: "philippines" },

  // === JAPAN 🇯🇵 === (30 stations)
  { id: "jp_moe", name: "LISTEN.moe J-Pop", genre: "J-Pop & Anime", streamUrl: "https://listen.moe/stream", logo: "🌸", country: "japan" },
  { id: "jp_vocaloid", name: "LISTEN.moe Vocaloid", genre: "Vocaloid", streamUrl: "https://listen.moe/vocaloid/stream", logo: "🤖", country: "japan" },
  { id: "jp_vocal_radio", name: "Vocaloid Radio JP", genre: "Synthesizer", streamUrl: "http://stream.vocaloidradio.com:8000/stream", logo: "👩‍🎤", country: "japan" },
  { id: "jp_miku_fm", name: "Miku FM Streaming", genre: "Vocaloid", streamUrl: "http://198.50.239.215:8482/stream", logo: "🎹", country: "japan" },
  { id: "jp_voca_nx", name: "Vocal Nexus", genre: "Vocaloid", streamUrl: "http://radio.vocalnexus.com:8000/stream", logo: "🎧", country: "japan" },
  { id: "jp_vocaloid_us", name: "Vocaloid Radio USA", genre: "Synthesizer", streamUrl: "https://curiosity.shoutca.st:8019/stream", logo: "🎤", country: "japan" },
  { id: "jp_retropc", name: "Retro PC Tokyo", genre: "8 tracks", streamUrl: "https://ice1.somafm.com/retropc-128-mp3", logo: "🎮", country: "japan" },
  { id: "jp_anime_ama", name: "Anime Amaze", genre: "Anime Music", streamUrl: "https://shoutcast.animeamaze.org:8000/;", logo: "✨", country: "japan" },
  { id: "jp_jpop_power", name: "J-Pop Powerplay", genre: "Modern J-Pop", streamUrl: "http://kathy.torontocast.com:8062/live", logo: "🔋", country: "japan" },
  { id: "jp_tokyo_fm", name: "Tokyo FM 80.0", genre: "Talk & Pop", streamUrl: "https://stream.zeno.fm/4vvkq7nt3veuv", logo: "🗼", country: "japan" },
  { id: "jp_nhk_r1", name: "NHK Radio 1 Tokyo", genre: "News", streamUrl: "https://stream.zeno.fm/6vvkq7nt3veuv", logo: "🎌", country: "japan" },
  { id: "jp_nhk_fm", name: "NHK FM Tokyo", genre: "Classical", streamUrl: "https://stream.zeno.fm/8vvkq7nt3veuv", logo: "🎼", country: "japan" },
  { id: "jp_j_club", name: "Japanimradio J-Club", genre: "Anime", streamUrl: "http://japanimradio.info:8000/j-club", logo: "🕺", country: "japan" },
  { id: "jp_j_rock", name: "Japanimradio J-Rock", genre: "J-Rock", streamUrl: "http://japanimradio.info:8000/j-rock", logo: "🎸", country: "japan" },
  { id: "jp_shonan", name: "Beach FM Shonan", genre: "Jazz", streamUrl: "https://stream.zeno.fm/9vvkq7nt3veuv", logo: "🐚", country: "japan" },
  { id: "jp_kyoto", name: "Kyoto Sanjo Cafe", genre: "Talk", streamUrl: "https://stream.zeno.fm/u8vkq7nt3veuz", logo: "🍵", country: "japan" },
  { id: "jp_osaka", name: "FM Osaka 85.1", genre: "Hits", streamUrl: "https://stream.zeno.fm/t8vkq7nt3veuz", logo: "🍱", country: "japan" },
  { id: "jp_nagoya", name: "FM Nagoya ZIP", genre: "Urban", streamUrl: "https://stream.zeno.fm/w8vkq7nt3veuz", logo: "🏯", country: "japan" },
  { id: "jp_fukuoka", name: "Love FM Fukuoka", genre: "World", streamUrl: "https://stream.zeno.fm/r8vkq7nt3veuz", logo: "💖", country: "japan" },
  { id: "jp_sapporo", name: "Air-G' Hokkaido", genre: "Beats", streamUrl: "https://stream.zeno.fm/v8vkq7nt3veuz", logo: "❄️", country: "japan" },
  { id: "jp_jazz", name: "JP Jazz Sakura", genre: "Smooth", streamUrl: "https://stream.zeno.fm/f8vkq7nt3veuz", logo: "🎷", country: "japan" },
  { id: "jp_genshin", name: "Genshin Relax Radio", genre: "OST", streamUrl: "https://stream.zeno.fm/7vvkq7nt3veuv", logo: "🍀", country: "japan" },
  { id: "jp_lofi_tokyo", name: "Lofi Tokyo Night", genre: "Lofi", streamUrl: "https://stream.zeno.fm/v8vkq7nt3veuz", logo: "🌙", country: "japan" },
  { id: "jp_kawaii", name: "Kawaii Music JP", genre: "Pop", streamUrl: "https://stream.zeno.fm/w8vkq7nt3veuz", logo: "🍭", country: "japan" },
  { id: "jp_future_funk", name: "Future Funk Japan", genre: "Funk", streamUrl: "https://stream.zeno.fm/r8vkq7nt3veuz", logo: "🌌", country: "japan" },
  { id: "jp_vaporwave", name: "Vaporwave Tokyo", genre: "Vaporwave", streamUrl: "https://stream.zeno.fm/t8vkq7nt3veuz", logo: "🎆", country: "japan" },
  { id: "jp_city_pop", name: "80s City Pop JP", genre: "City Pop", streamUrl: "https://stream.zeno.fm/u8vkq7nt3veuz", logo: "🚕", country: "japan" },
  { id: "jp_touhou", name: "Touhou Music Radio", genre: "Game Mix", streamUrl: "https://stream.zeno.fm/6vvkq7nt3veuv", logo: "⛩️", country: "japan" },

  // === UNITED STATES 🇺🇸 === (5 stations)
  { id: "us_groove", name: "SomaFM Groove Salad", genre: "Ambient", streamUrl: "https://ice1.somafm.com/groovesalad-128-mp3", logo: "🥗", country: "usa" },
  { id: "us_kexp", name: "KEXP Seattle", genre: "Indie Rock", streamUrl: "https://kexp-mp3-128.streamguys1.com/kexp128.mp3", logo: "🎸", country: "usa" },
  { id: "us_lofi", name: "SomaFM Lofi Lounge", genre: "Lofi", streamUrl: "https://ice1.somafm.com/lofi-128-mp3", logo: "💤", country: "usa" },
  { id: "us_wnyc", name: "WNYC 93.9 NY", genre: "News & Talk", streamUrl: "https://fm939.wnyc.org/wnycfm-web", logo: "📰", country: "usa" },
  { id: "us_80s", name: "80s Hits Central", genre: "80s Pop", streamUrl: "https://stream.zeno.fm/v8vkq7nt3veuu", logo: "📼", country: "usa" },

  // === UNITED KINGDOM 🇬🇧 === (5 stations)
  { id: "uk_smooth", name: "Smooth Radio London", genre: "Relaxing", streamUrl: "https://media-ssl.musicradio.com/SmoothLondonMP3", logo: "🎷", country: "uk" },
  { id: "uk_classic", name: "Classic FM UK", genre: "Classical", streamUrl: "https://media-ssl.musicradio.com/ClassicFM", logo: "🎻", country: "uk" },
  { id: "uk_heart", name: "Heart FM London", genre: "Pop Hits", streamUrl: "https://media-ssl.musicradio.com/HeartLondonMP3", logo: "🍿", country: "uk" },
  { id: "uk_bbc1", name: "BBC Radio 1", genre: "Youth Pop", streamUrl: "https://stream.zeno.fm/w8vkq7nt3veuu", logo: "🇬🇧", country: "uk" },
  { id: "uk_magic", name: "Magic Radio UK", genre: "Soft Pop", streamUrl: "https://stream.zeno.fm/r8vkq7nt3veuu", logo: "🪄", country: "uk" },

  // === FRANCE 🇫🇷 === (4 stations)
  { id: "fr_fip", name: "FIP Radio France", genre: "Eclectic", streamUrl: "https://stream.radiofrance.fr/fip/fip.mp3", logo: "🥐", country: "france" },
  { id: "fr_nrj", name: "NRJ Hit Music", genre: "Dance", streamUrl: "https://stream.nrj.fr/128", logo: "⚡", country: "france" },
  { id: "fr_inter", name: "France Inter", genre: "Culture", streamUrl: "https://stream.radiofrance.fr/franceinter/franceinter.mp3", logo: "🏛️", country: "france" },
  { id: "fr_nostalgie", name: "Nostalgie France", genre: "Oldies", streamUrl: "http://stream.zeno.fm/w8vkq7nt3veuv", logo: "📻", country: "france" },

  // === GERMANY 🇩🇪 === (2 stations)
  { id: "de_antenne", name: "Antenne Bayern", genre: "Pop Hits", streamUrl: "https://stream.antenne.de/antenne/stream/mp3", logo: "🥨", country: "germany" },
  { id: "de_techno", name: "TechnoBase.FM", genre: "Techno", streamUrl: "https://stream.technobase.fm/mp3/", logo: "🔊", country: "germany" },

  // === AUSTRALIA 🇦🇺 === (1 station)
  { id: "au_triplej", name: "Triple J Sydney", genre: "Indie", streamUrl: "https://live-radio-aes.mediahubaustralia.com/3JJW/mp3/", logo: "🐨", country: "australia" }
];
