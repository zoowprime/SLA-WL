// src/events/qcmNoCmd.js
require('dotenv').config({ path: './id.env' });
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField,
} = require('discord.js');

const QUESTIONS = require('../data/qcmQuestions.json');

// ===== Helpers =====
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr, n) {
  const a = shuffle(arr);
  return typeof n === 'number' ? a.slice(0, n) : a;
}
function emojiIndex(i) {
  return ['🅰️', '🅱️', '🇨'][i] || '🔸';
}
function emojifyChoices(choices) {
  // choices sont SANS emoji dans le JSON → on ajoute ici
  return choices.map((c, i) => `${emojiIndex(i)} ${c}`);
}
function sanitizeLabel(label) {
  return String(label).slice(0, 100);
}
function staffRoleIdsFromEnv() {
  return [
    process.env.MODO_ROLE_ID,
    process.env.ADMIN_ROLE_ID,
    process.env.SUPADMIN_ROLE_ID,
    process.env.DEV_ROLE_ID,
    process.env.REFSTAFF_ROLE_ID,
    process.env.CONSEILLER_ROLE_ID,
    process.env.COFONDA_ROLE_ID,
    process.env.FONDA_ROLE_ID,
    ...(process.env.QCM_STAFF_ROLE_IDS || '').split(',').map(s => s.trim())
  ].filter(Boolean);
}

async function logQcm(client, payload) {
  const logChId = process.env.QCM_LOGS_CHANNEL_ID;
  if (!logChId) return;
  try {
    const ch = await client.channels.fetch(logChId);
    if (!ch?.isTextBased()) return;

    const {
      type, user, channelId, score, total,
      questionIndex, question, selected, correct, passed,
    } = payload;

    const color = type === 'end' ? (passed ? 0x00ff88 : 0xff4444)
                : type === 'answer' ? 0xffcc00
                : 0x5865F2;
    const title = type === 'start' ? '🟢 Démarrage QCM'
                : type === 'answer' ? '📝 Réponse QCM'
                : '🏁 Fin de QCM';

    const eb = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp()
      .addFields(
        { name: '👤 Joueur', value: `<@${user.id}> \`${user.tag}\``, inline: true },
        { name: '🧵 Salon', value: `<#${channelId}>`, inline: true },
      );

    if (type === 'answer') {
      eb.addFields(
        { name: `#️⃣ Question ${questionIndex + 1}`, value: `${question}`.slice(0, 1024), inline: false },
        { name: '🔘 Choix du joueur', value: `${selected}`.slice(0, 1024), inline: false },
        { name: '✅ Correct ?', value: correct ? 'Oui ✅' : 'Non ❌', inline: true },
      );
    }
    if (type === 'end') {
      eb.addFields(
        { name: '📊 Score', value: `**${score} / ${total}**`, inline: true },
        { name: '🎯 Statut', value: passed ? 'Réussi ✅' : 'Échoué ❌', inline: true },
      );
    }
    await ch.send({ embeds: [eb] });
  } catch {}
}

// ===== Module principal =====
module.exports = (client) => {
  // 1) Panneau de lancement (unique)
  client.once('clientReady', async () => {
    const chId = process.env.QCM_LANCEMENT_CHANNEL_ID;
    if (!chId) return console.error('[QCM] QCM_LANCEMENT_CHANNEL_ID non défini');

    const ch = await client.channels.fetch(chId).catch(() => null);
    if (!ch || !ch.isTextBased()) return console.error('[QCM] Salon de lancement introuvable');

    const recent = await ch.messages.fetch({ limit: 50 }).catch(() => null);
    if (recent?.some(m => m.components?.[0]?.components?.[0]?.customId === 'qcm_launcher')) return;

    const info1 = process.env.QCM_INFO_CHANNEL_1_ID ? `<#${process.env.QCM_INFO_CHANNEL_1_ID}>` : '—';
    const info2 = process.env.QCM_INFO_CHANNEL_2_ID ? `<#${process.env.QCM_INFO_CHANNEL_2_ID}>` : '—';

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🎓 Bienvenue sur le **QCM d’admission** !')
      .setDescription(
        [
          `👋 **Salut et bienvenue !** Ce QCM vérifie que tu connais bien nos règles et l’esprit de **South Los Angeles**.`,
          `📚 Avant de commencer, lis attentivement : ${info1} • ${info2}`,
          `🧠 Le QCM contient **50 questions** à choix multiples. Il faut **32/50** pour réussir.`,
          `💡 *Conseil* : prends ton temps, lis bien chaque question. **Actes = Conséquences** ⚖️`,
          `⬇️ **Ouvre le menu** ci-dessous pour **démarrer**.`,
        ].join('\n\n')
      );

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('qcm_launcher')
        .setPlaceholder('🚀 Lancer le QCM…')
        .addOptions([{ label: '🚀 Démarrer le QCM', value: 'launch', description: 'Crée ton salon privé et commence le test.' }])
    );

    await ch.send({ embeds: [embed], components: [row] });
  });

  // 2) Interactions
  client.on('interactionCreate', async (interaction) => {
    try {
      // 2.1 Lanceur
      if (interaction.isStringSelectMenu() && interaction.customId === 'qcm_launcher') {
        const member = interaction.member;
        if (interaction.values?.[0] !== 'launch') {
          return interaction.reply({ content: '❌ Choix invalide.', ephemeral: true });
        }

        const QCM_EN_COURS = process.env.QCM_EN_COURS_ROLE_ID;
        if (!QCM_EN_COURS) {
          return interaction.reply({ content: '⚠️ QCM_EN_COURS_ROLE_ID manquant.', ephemeral: true });
        }
        try {
          await member.roles.add(QCM_EN_COURS).catch(() => {});
          await interaction.reply({ content: '✅ **QCM EN COURS** ajouté. Création de ton salon…', ephemeral: true });
        } catch {
          return interaction.reply({ content: '❗ Impossible d’ajouter le rôle QCM EN COURS (permissions ?).', ephemeral: true }).catch(()=>{});
        }

        // Salon privé QCM
        let channel;
        try {
          const parent = process.env.QCM_CATEGORY_OPEN_ID || null;
          const staffRoles = staffRoleIdsFromEnv();
          const overwrites = [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          ];
          for (const rid of staffRoles) {
            overwrites.push({ id: rid, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ReadMessageHistory] });
          }
          channel = await interaction.guild.channels.create({
            name: `qcm-${member.user.username}`.toLowerCase().replace(/[^a-z0-9\-]/g, ''),
            type: ChannelType.GuildText,
            parent,
            permissionOverwrites: overwrites,
            reason: 'QCM: nouveau candidat',
          });
        } catch {
          return interaction.followUp({ content: '❗ Impossible de créer ton salon QCM (permissions ?).', ephemeral: true }).catch(()=>{});
        }

        await logQcm(interaction.client, {
          type: 'start',
          user: { id: member.id, tag: member.user.tag },
          channelId: channel.id,
        });

        const startEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🎬 Prêt à commencer ?')
          .setDescription(
            [
              `**Bonjour ${member},**`,
              `Tu vas passer **50 questions**. Prends ton temps et lis bien chaque proposition.`,
              `Clique sur **Oui** pour lancer le QCM, ou **Non** pour annuler.`,
            ].join('\n\n')
          )
          .setFooter({ text: 'Bonne chance ! 🍀' });

        const startRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`qcm_start_${member.id}`)
            .setPlaceholder('🟢 Lancer le QCM ?')
            .addOptions(
              { label: '✅ Oui, démarrer', value: 'yes', description: 'Je démarre le test maintenant.' },
              { label: '❌ Non, annuler', value: 'no',  description: 'Je reviendrai plus tard.' },
            )
        );

        const msg = await channel.send({ embeds: [startEmbed], components: [startRow] });
        channel.qcmState = { msgId: msg.id, step: 'start' };
        return;
      }

      // 2.2 Start (Oui/Non)
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('qcm_start_')) {
        const userId = interaction.customId.split('_')[2];
        if (interaction.user.id !== userId) {
          return interaction.reply({ content: '❌ Ce menu ne vous est pas destiné.', ephemeral: true });
        }
        const choice = interaction.values[0];
        const channel = interaction.channel;

        const msg = channel && channel.qcmState?.msgId ? await channel.messages.fetch(channel.qcmState.msgId).catch(()=>null) : null;
        if (!msg) return;

        if (choice === 'no') {
          const QCM_EN_COURS = process.env.QCM_EN_COURS_ROLE_ID;
          const member = await interaction.guild.members.fetch(userId).catch(()=>null);
          if (member && QCM_EN_COURS) await member.roles.remove(QCM_EN_COURS).catch(()=>{});

          const canceled = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🛑 QCM annulé')
            .setDescription('Tu as annulé le QCM. Tu pourras revenir quand tu veux via le salon de lancement.');

          await interaction.update({});
          await msg.edit({ embeds: [canceled], components: [] }).catch(()=>{});
          return;
        }

        const totalQuestions = Math.min(50, Array.isArray(QUESTIONS) ? QUESTIONS.length : 0);
        const pool = pick(QUESTIONS, totalQuestions).map(q => {
          const shuffledChoices = shuffle(q.choices);
          return { question: q.question, choices: shuffledChoices, answer: q.answer };
        });

        channel.qcmState = {
          msgId: msg.id,
          step: 'question',
          index: 0,
          score: 0,
          pool,
          pendingChoiceIndex: null,
          needed: 32,
        };

        await interaction.update({});
        await renderQuestion(interaction.client, channel, userId);
        return;
      }

      // 2.3 Choix -> confirmation
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('qcm_q_')) {
        const [, , expectedUserId] = interaction.customId.split('_');
        if (interaction.user.id !== expectedUserId) {
          return interaction.reply({ content: '❌ Ce menu ne vous est pas destiné.', ephemeral: true });
        }
        const channel = interaction.channel;
        const st = channel.qcmState;
        if (!st || st.step !== 'question') {
          return interaction.reply({ content: '⚠️ Cette question n’est plus active.', ephemeral: true });
        }

        const selectedIdx = Number(interaction.values[0] ?? -1);
        if (Number.isNaN(selectedIdx) || selectedIdx < 0 || selectedIdx > 2) {
          return interaction.reply({ content: '❌ Sélection invalide.', ephemeral: true });
        }

        st.pendingChoiceIndex = selectedIdx;
        st.step = 'confirm';

        const msg = await channel.messages.fetch(st.msgId).catch(()=>null);
        if (!msg) return;

        const q = st.pool[st.index];
        const labels = emojifyChoices(q.choices).map(sanitizeLabel);
        const chosen = labels[selectedIdx];

        const confirmEmbed = new EmbedBuilder()
          .setColor(0xF1C40F)
          .setTitle(`❓ Question ${st.index + 1} / ${st.pool.length}`)
          .setDescription(
            [`**${q.question}**`, '', `👉 Tu as sélectionné : **${chosen}**`, '', `❔ **Es-tu sûr de ta réponse ?**`].join('\n')
          );

        const confirmRow = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`qcm_confirm_${expectedUserId}`)
            .setPlaceholder('📝 Confirmer ton choix ?')
            .addOptions(
              { label: '✅ Oui, valider ma réponse', value: 'yes', description: 'Valider et passer à la suite' },
              { label: '↩️ Non, corriger mon choix', value: 'no',  description: 'Revenir au menu de réponses' },
            )
        );

        await interaction.update({});
        await msg.edit({ embeds: [confirmEmbed], components: [confirmRow] }).catch(()=>{});
        return;
      }

      // 2.4 Confirmation -> valider/revenir
      if (interaction.isStringSelectMenu() && interaction.customId.startsWith('qcm_confirm_')) {
        const expectedUserId = interaction.customId.split('_')[2];
        if (interaction.user.id !== expectedUserId) {
          return interaction.reply({ content: '❌ Ce menu ne vous est pas destiné.', ephemeral: true });
        }

        const channel = interaction.channel;
        const st = channel.qcmState;
        if (!st) return interaction.reply({ content: '⚠️ Cette session est terminée.', ephemeral: true });

        const choice = interaction.values[0];
        if (choice === 'no') {
          st.step = 'question';
          st.pendingChoiceIndex = null;
          await interaction.update({});
          await renderQuestion(interaction.client, channel, expectedUserId);
          return;
        }

        // Validation
        const q = st.pool[st.index];
        const selectedIdx = st.pendingChoiceIndex;
        const selectedRaw = q.choices[selectedIdx];        // <- brut, sans emoji
        const correct = selectedRaw === q.answer;          // comparaison fiable

        if (correct) st.score++;

        await logQcm(interaction.client, {
          type: 'answer',
          user: { id: expectedUserId, tag: interaction.user.tag },
          channelId: channel.id,
          questionIndex: st.index,
          question: q.question,
          selected: `${emojiIndex(selectedIdx)} ${selectedRaw}`, // affichage avec emoji
          correct,
        });

        st.index++;
        st.step = 'question';
        st.pendingChoiceIndex = null;

        await interaction.update({});

        if (st.index >= st.pool.length) {
          const total = st.pool.length;
          const passed = st.score >= st.needed;

          const QCM_EN_COURS = process.env.QCM_EN_COURS_ROLE_ID;
          const ORAL_A_FAIRE = process.env.ORAL_A_FAIRE_ROLE_ID;
          try {
            const member = await interaction.guild.members.fetch(expectedUserId);
            if (QCM_EN_COURS) await member.roles.remove(QCM_EN_COURS).catch(()=>{});
            if (passed && ORAL_A_FAIRE) await member.roles.add(ORAL_A_FAIRE).catch(()=>{});
          } catch {}

          await logQcm(interaction.client, {
            type: 'end',
            user: { id: expectedUserId, tag: interaction.user.tag },
            channelId: channel.id,
            score: st.score,
            total,
            passed,
          });

          const result = new EmbedBuilder()
            .setColor(passed ? 0x00CC88 : 0xED4245)
            .setTitle(passed ? '🎉 QCM réussi !' : '❌ QCM échoué')
            .setDescription(
              [
                `**Score : ${st.score} / ${total}**`,
                passed
                  ? '👏 Bravo ! Tu as validé la partie QCM. Un rôle **ORAL À FAIRE** t’a été attribué — suis les consignes du staff pour la suite.'
                  : 'Tu n’as pas atteint **32 bonnes réponses**. Tu pourras retenter plus tard — relis bien les salons d’infos.',
              ].join('\n\n')
            )
            .setFooter({ text: passed ? 'Étape suivante : ORAL 🎙️' : 'Courage, la prochaine sera la bonne ! 💪' });

          const msg = await channel.messages.fetch(st.msgId).catch(()=>null);
          if (msg) await msg.edit({ embeds: [result], components: [] }).catch(()=>{});

          const archiveCat = process.env.QCM_CATEGORY_ARCHIVE_ID;
          if (archiveCat) channel.setParent(archiveCat).catch(()=>{});

          channel.qcmState = null;
          return;
        }

        await renderQuestion(interaction.client, channel, expectedUserId);
        return;
      }
    } catch (e) {
      try { if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '⚠️ Une erreur est survenue pendant le QCM.', ephemeral: true });
      }} catch {}
      console.error('[QCM] Uncaught error:', e);
    }
  });
};

// ===== Rendu d’une question (1 seul embed) =====
async function renderQuestion(client, channel, userId) {
  const st = channel.qcmState;
  if (!st) return;
  const q = st.pool[st.index];

  const labels = emojifyChoices(q.choices).map(sanitizeLabel);
  const embed = new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`🧠 Question ${st.index + 1} / ${st.pool.length}`)
    .setDescription(
      [
        `**${q.question}**`,
        '',
        '👉 Sélectionne ta réponse ci-dessous dans le **menu**.',
        '📝 Tu auras une **confirmation** avant validation définitive.',
      ].join('\n')
    )
    .setFooter({ text: 'Lis attentivement — actes = conséquences ⚖️' });

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`qcm_q_${userId}`)
      .setPlaceholder('📥 Choisis ta réponse…')
      .addOptions(
        labels.map((label, idx) => ({
          label: sanitizeLabel(label),
          value: String(idx),
          description: ['Choix A', 'Choix B', 'Choix C'][idx],
        }))
      )
  );

  const msg = await channel.messages.fetch(st.msgId).catch(()=>null);
  if (msg) await msg.edit({ embeds: [embed], components: [row] }).catch(()=>{});
}
