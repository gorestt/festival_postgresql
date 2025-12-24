require("dotenv").config();
const bcrypt = require("bcrypt");
const { Client } = require("pg");

async function main() {
  const host = process.env.PGHOST || "localhost";
  const port = parseInt(process.env.PGPORT || "5432", 10);
  const database = process.env.PGDATABASE || "festivaldb";
  const user = process.env.PGUSER || "festival_app";
  const password = process.env.PGPASSWORD || "festival_app";

  const client = new Client({ host, port, database, user, password });
  await client.connect();

  // Clean existing demo data (keep schema)
  await client.query("DELETE FROM ratings");
  await client.query("DELETE FROM performances");
  await client.query("DELETE FROM stages");
  await client.query("DELETE FROM artists");
  await client.query("DELETE FROM festivals");
  await client.query("DELETE FROM users");

  // Users
  const users = [
    { full_name: "Администратор (Demo)", email: "admin@demo.local", pass: "Admin123!", role: "ADMIN" },
    { full_name: "Организатор (Demo)", email: "org@demo.local", pass: "Org123!", role: "ORGANIZER" },
    { full_name: "Зритель (Demo)", email: "viewer@demo.local", pass: "Viewer123!", role: "VIEWER" }
  ];

  const userIds = {};
  for (const u of users) {
    const hash = await bcrypt.hash(u.pass, 12);
    const r = await client.query(
      "INSERT INTO users(full_name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id",
      [u.full_name, u.email, hash, u.role]
    );
    userIds[u.role] = r.rows[0].id;
  }

  // Festivals
  const festivalData = [
    {
      name: "Aurora Sound Week",
      city: "Helsinki",
      country: "Finland",
      start_date: "2026-06-10",
      end_date: "2026-06-13",
      genre: "Electronic / Indie",
      website: "https://example.com/aurora",
      description: "Летний городской фестиваль на стыке электроники и инди: лайв-сеты, арт-инсталляции и ночные сцены.",
    },
    {
      name: "Baltic Jazz Harbor",
      city: "Tallinn",
      country: "Estonia",
      start_date: "2026-07-22",
      end_date: "2026-07-25",
      genre: "Jazz",
      website: "https://example.com/baltic-jazz",
      description: "Джаз у моря: камерные концерты, мастер-классы, ночные джемы и программа для молодых музыкантов."
    },
    {
      name: "Nordic Rock Summit",
      city: "Stockholm",
      country: "Sweden",
      start_date: "2026-08-14",
      end_date: "2026-08-16",
      genre: "Rock / Alternative",
      website: "https://example.com/nordic-rock",
      description: "Фестиваль альтернативного рока с фокусом на северное звучание и мощные лайвы на больших сценах."
    }
  ];

  const festIds = [];
  for (const f of festivalData) {
    const r = await client.query(
      `INSERT INTO festivals(name,city,country,start_date,end_date,genre,website,description,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [f.name, f.city, f.country, f.start_date, f.end_date, f.genre, f.website, f.description, userIds["ORGANIZER"]]
    );
    festIds.push(r.rows[0].id);
  }

  // Artists
  const artists = [
    { name: "Neon Fjords", genre: "Electronic", country: "Norway", description: "Дуэт с холодными синтезаторными текстурами и энергичным грувом." },
    { name: "Velvet Tram", genre: "Indie", country: "Finland", description: "Инди-проект с живыми гитарами и мелодичным вокалом." },
    { name: "Harbor Quintet", genre: "Jazz", country: "Estonia", description: "Квинтет современного джаза с импровизацией и латинскими ритмами." },
    { name: "Northern Sparks", genre: "Rock", country: "Sweden", description: "Альтернативный рок с мощной ритм-секцией и яркими хуками." },
    { name: "Midnight Brass", genre: "Jazz/Funk", country: "Denmark", description: "Брасс-секция с фанковыми аранжировками для ночных сцен." }
  ];
  const artistIds = [];
  for (const a of artists) {
    const r = await client.query(
      `INSERT INTO artists(name,genre,country,description,created_by)
       VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [a.name, a.genre, a.country, a.description, userIds["ORGANIZER"]]
    );
    artistIds.push(r.rows[0].id);
  }

  // Stages (2 per festival)
  const stageIds = [];
  for (let i=0;i<festIds.length;i++) {
    const fid = festIds[i];
    const s1 = await client.query("INSERT INTO stages(festival_id,name,capacity,description) VALUES($1,$2,$3,$4) RETURNING id",
      [fid, "Main Stage", 18000, "Главная сцена с большой постановкой света и звука."]);
    const s2 = await client.query("INSERT INTO stages(festival_id,name,capacity,description) VALUES($1,$2,$3,$4) RETURNING id",
      [fid, "Night Lab", 4500, "Ночная сцена для экспериментальных сетов и приглашенных гостей."]);
    stageIds.push([s1.rows[0].id, s2.rows[0].id]);
  }

  // Performances (sample)
  const perf = [
    // Aurora
    { festival: 0, stageIdx: 0, artist: 0, start: "2026-06-10T18:00:00+03:00", end: "2026-06-10T19:15:00+03:00", attendance: 12000, notes: "Открытие фестиваля." },
    { festival: 0, stageIdx: 1, artist: 1, start: "2026-06-10T21:30:00+03:00", end: "2026-06-10T22:30:00+03:00", attendance: 3200, notes: "Инди-блок." },
    { festival: 0, stageIdx: 1, artist: 0, start: "2026-06-11T00:10:00+03:00", end: "2026-06-11T01:30:00+03:00", attendance: 4100, notes: "Ночной лайв-сет." },
    // Baltic Jazz
    { festival: 1, stageIdx: 0, artist: 2, start: "2026-07-22T19:00:00+03:00", end: "2026-07-22T20:20:00+03:00", attendance: 8000, notes: "Премьера новой программы." },
    { festival: 1, stageIdx: 1, artist: 4, start: "2026-07-23T23:30:00+03:00", end: "2026-07-24T00:30:00+03:00", attendance: 3200, notes: "Ночной фанк-джем." },
    // Nordic Rock
    { festival: 2, stageIdx: 0, artist: 3, start: "2026-08-14T20:30:00+03:00", end: "2026-08-14T21:50:00+03:00", attendance: 15000, notes: "Хедлайнер вечера." }
  ];

  for (const p of perf) {
    await client.query(
      `INSERT INTO performances(festival_id,stage_id,artist_id,start_time,end_time,expected_attendance,notes)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [festIds[p.festival], stageIds[p.festival][p.stageIdx], artistIds[p.artist], p.start, p.end, p.attendance, p.notes]
    );
  }

  // Ratings
  // viewer rates all three, organizer rates one
  await client.query(`INSERT INTO ratings(festival_id,user_id,rating,review) VALUES($1,$2,$3,$4)`,
    [festIds[0], userIds["VIEWER"], 5, "Отличная организация, сильная программа и визуал!" ]);
  await client.query(`INSERT INTO ratings(festival_id,user_id,rating,review) VALUES($1,$2,$3,$4)`,
    [festIds[1], userIds["VIEWER"], 4, "Очень атмосферно, хотелось бы больше ночных джемов." ]);
  await client.query(`INSERT INTO ratings(festival_id,user_id,rating,review) VALUES($1,$2,$3,$4)`,
    [festIds[2], userIds["VIEWER"], 4, "Мощный звук и сцена. Очереди на входе стоит оптимизировать." ]);
  await client.query(`INSERT INTO ratings(festival_id,user_id,rating,review) VALUES($1,$2,$3,$4)`,
    [festIds[0], userIds["ORGANIZER"], 5, "Лучшая аудитория и идеальная погода." ]);

  await client.end();
  console.log("DB seed done.");
}

main().catch((e) => {
  console.error("DB seed failed:", e.message);
  process.exit(1);
});
