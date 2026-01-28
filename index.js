require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const films = new Map(); // تخزين الأفلام

client.once("ready", () => {
  console.log(`🎬 Logged in as ${client.user.tag}`);
});

/* =======================
   !addfilm
   ======================= */
/*
الاستخدام:
!addfilm Interstellar 3 https://site.com/watch/interstellar
*/

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.split(" ");
  const command = args.shift()?.toLowerCase();

  if (command === "!addfilm") {
    const name = args.shift();
    const maxMembers = parseInt(args.shift());
    const link = args.join(" ");

    if (!name || !maxMembers || !link) {
      return message.reply(
        "❌ الاستخدام الصحيح:\n`!addfilm اسم_الفيلم عدد_الأعضاء الرابط`"
      );
    }

    films.set(name.toLowerCase(), {
      name,
      link,
      maxMembers,
      joined: [],
      played: false,
    });

    message.reply(
      `✅ تم إضافة الفيلم **${name}**\n👥 عدد الأعضاء: ${maxMembers}`
    );
  }

  /* =======================
     !cinema
     ======================= */

  if (command === "!cinema") {
    if (films.size === 0)
      return message.reply("❌ لا يوجد أفلام مضافة.");

    const list = [...films.values()]
      .map((f) => `🎬 **${f.name}**`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🎥 Cinema Party")
      .setDescription(list)
      .setColor("Red");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("choose_film")
        .setLabel("اختار 🎬")
        .setStyle(ButtonStyle.Primary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

/* =======================
   Buttons
   ======================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  /* زر اختيار */
  if (interaction.customId === "choose_film") {
    await interaction.reply({
      content: "✍️ اكتب اسم الفيلم:",
      ephemeral: true,
    });

    const filter = (m) => m.author.id === interaction.user.id;
    const collected = await interaction.channel.awaitMessages({
      filter,
      max: 1,
      time: 20000,
    });

    if (!collected.size) return;

    const filmName = collected.first().content.toLowerCase();
    const film = films.get(filmName);

    if (!film)
      return interaction.followUp({
        content: "❌ الفيلم غير موجود",
        ephemeral: true,
      });

    const embed = new EmbedBuilder()
      .setTitle("🎬 Film Lobby")
      .setDescription(
        `**${film.name}**\n👥 ${film.joined.length}/${film.maxMembers}`
      )
      .setColor("Blue");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_${film.name}`)
        .setLabel(`Members (${film.maxMembers})`)
        .setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });
  }

  /* زر Members */
  if (interaction.customId.startsWith("join_")) {
    const filmName = interaction.customId.replace("join_", "").toLowerCase();
    const film = films.get(filmName);

    if (!film || film.played) {
      return interaction.reply({
        content: "❌ هذا الفيلم انتهى.",
        ephemeral: true,
      });
    }

    if (film.joined.includes(interaction.user.id)) {
      return interaction.reply({
        content: "⚠️ أنت بالفعل مشارك.",
        ephemeral: true,
      });
    }

    film.joined.push(interaction.user.id);

    await interaction.reply({
      content: `✅ انضممت (${film.joined.length}/${film.maxMembers})`,
      ephemeral: true,
    });

    /* شرط التشغيل */
    if (film.joined.length === film.maxMembers) {
      film.played = true;

      const embed = new EmbedBuilder()
        .setTitle("🎬 Now Playing")
        .setDescription(
          `**${film.name}**\n\n🔗 ${film.link}\n\n🍿 استمتعوا`
        )
        .setColor("Green");

      await interaction.channel.send({ embeds: [embed] });

      film.joined = []; // تصفير
    }
  }
});

client.login(process.env.TOKEN);
