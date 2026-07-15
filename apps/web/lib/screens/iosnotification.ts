"use client";

import { esc, textBlock, wrapText, systemFont } from "./common";
import type { IosNotificationDoc } from "./types";

export function iosNotificationSize(doc: IosNotificationDoc): { width: number; height: number } {
  const width = 402;
  const paddingX = 16;
  const cardW = width - 24; // margin of 12 on each side
  const bodyW = cardW - 66 - paddingX; // avatar offset
  
  const bodyLines = wrapText(doc.body, 13, bodyW);
  const bodyH = bodyLines.length * 16.5;
  const contentH = 46 + (doc.subtitle ? 18 : 0) + bodyH + 12;
  
  return {
    width,
    height: Math.max(90, Math.min(220, Math.round(contentH + 24))),
  };
}

export function renderIosNotification(doc: IosNotificationDoc, avatarUrl?: string): string {
  const isDark = !!doc.dark;
  const width = 402;
  const height = doc.standalone ? iosNotificationSize(doc).height : 874;
  
  const marginX = 12;
  const cardW = width - marginX * 2;
  
  const font = systemFont("ios");
  const textPrimary = isDark ? "#ffffff" : "#000000";
  const textSecondary = isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.45)";
  const cardBg = isDark ? "rgba(25, 25, 28, 0.66)" : "rgba(255, 255, 255, 0.68)";
  const cardStroke = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const shadowColor = isDark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.15)";

  // Render a single notification card
  const renderCard = (x: number, y: number, item: { title: string; subtitle?: string; body: string; time: string; avatar?: string; appName: string }) => {
    const bodyW = cardW - 66 - 16;
    const bodyLines = wrapText(item.body, 13, bodyW);
    const bodyH = bodyLines.length * 16.5;
    const cardH = 46 + (item.subtitle ? 18 : 0) + bodyH + 12;
    
    // Default avatar: circle with initials
    const defaultAvatarSvg = `
      <circle cx="${x + 16 + 19}" cy="${y + 16 + 19}" r="19" fill="#7c3aed" opacity="0.85"/>
      <text x="${x + 16 + 19}" y="${y + 16 + 23}" font-family="${font}" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">${esc(item.title.slice(0, 1).toUpperCase())}</text>
    `;

    // Overlapping App Icon (iMessage green bubble or custom)
    const appIconBadge = `
      <g transform="translate(${x + 16 + 24}, ${y + 16 + 24})">
        <circle cx="8" cy="8" r="8" fill="#34c759" stroke="${isDark ? "#1c1c1e" : "#ffffff"}" stroke-width="1.5"/>
        <!-- Mini white speech bubble -->
        <path d="M5,7.5 C5,5.8 6.3,4.5 8,4.5 C9.7,4.5 11,5.8 11,7.5 C11,9.2 9.7,10.5 8,10.5 C7.5,10.5 7.1,10.4 6.7,10.2 L5,11 L5.5,9.5 C5.2,8.9 5,8.2 5,7.5 Z" fill="#ffffff"/>
      </g>
    `;

    const avatarClipId = `av-clip-${y}`;

    return `
      <g>
        <defs>
          <filter id="notif-shadow-${y}" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="${shadowColor}" flood-opacity="0.2"/>
          </filter>
          <clipPath id="${avatarClipId}"><circle cx="${x + 16 + 19}" cy="${y + 16 + 19}" r="19"/></clipPath>
        </defs>
        
        <!-- Frosted Glass Card Base -->
        <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="20" fill="${cardBg}" stroke="${cardStroke}" stroke-width="0.5" filter="url(#notif-shadow-${y})" style="backdrop-filter: blur(24px);"/>
        
        <!-- Avatar image or fallback -->
        ${
          item.avatar
            ? `<image href="${item.avatar}" x="${x + 16}" y="${y + 16}" width="38" height="38" preserveAspectRatio="xMidYMid slice" clip-path="url(#${avatarClipId})"/>`
            : defaultAvatarSvg
        }
        
        <!-- Overlapping App Icon Badge -->
        ${appIconBadge}

        <!-- Top Header row (Sender Name & Time) -->
        <text x="${x + 66}" y="${y + 29}" font-family="${font}" font-size="14" font-weight="700" fill="${textPrimary}" letter-spacing="-0.15">${esc(item.title)}</text>
        <text x="${x + cardW - 16}" y="${y + 29}" font-family="${font}" font-size="11.5" font-weight="400" fill="${textSecondary}" text-anchor="end">${esc(item.time)}</text>
        
        <!-- Subtitle/Subject (Optional) -->
        ${
          item.subtitle
            ? `<text x="${x + 66}" y="${y + 46}" font-family="${font}" font-size="13.5" font-weight="600" fill="${textPrimary}" letter-spacing="-0.1">${esc(item.subtitle)}</text>`
            : ""
        }
        
        <!-- Body Text -->
        ${textBlock(bodyLines, {
          font,
          x: x + 66,
          y: y + 47 + (item.subtitle ? 18 : 0),
          size: 13,
          lineHeight: 16.5,
          color: isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.8)",
          weight: 400,
        })}
      </g>
    `;
  };

  if (doc.standalone) {
    return `
      <g>
        ${renderCard(marginX, 12, {
          title: doc.title,
          subtitle: doc.subtitle,
          body: doc.body,
          time: doc.time,
          avatar: avatarUrl,
          appName: doc.appName,
        })}
      </g>
    `;
  }
  
  // lockscreen stacked notification data
  const notif1 = {
    title: doc.title || "Armando Cajide",
    subtitle: doc.subtitle || "Gym Training",
    body: doc.body || "Anyone up for powerlifting this weekend?",
    time: doc.time || "now",
    avatar: avatarUrl,
    appName: doc.appName || "Messages",
  };
  
  const notif2 = {
    title: "Ashley Rico",
    subtitle: "To you & Dawn Ramirez",
    body: "Want to come over to our place for dinner tonight? We're grilling and the kids are baking cookies 🍪 for dessert.",
    time: "2m ago",
    appName: "Messages",
  };

  const notif3 = {
    title: "Meri Alvarez",
    subtitle: "Family Reunion 🎉",
    body: "So excited to see everyone at the reunion next week!!",
    time: "8m ago",
    appName: "Messages",
  };

  const lockBg = isDark 
    ? "linear-gradient(205deg, #131b2e 0%, #030408 100%)" 
    : "linear-gradient(205deg, #b0c9e8 0%, #f7f9ff 100%)";
    
  return `
    <rect width="${width}" height="${height}" fill="${lockBg}"/>
    
    <!-- Lock Screen Details (Clock + Date) -->
    <g opacity="0.95">
      <!-- Date -->
      <text x="${width / 2}" y="125" font-family="${font}" font-size="20" font-weight="600" fill="${textPrimary}" text-anchor="middle" letter-spacing="-0.2">Tuesday, April 1</text>
      <!-- Clock -->
      <text x="${width / 2}" y="210" font-family="${font}" font-size="86" font-weight="500" fill="${textPrimary}" text-anchor="middle" letter-spacing="-2.5">9:41</text>
    </g>
    
    <!-- Staked Lock Screen Notifications (dynamic + reference fallbacks) -->
    ${renderCard(marginX, 260, notif1)}
    ${renderCard(marginX, 395, notif2)}
    ${renderCard(marginX, 555, notif3)}
    
    <!-- Camera/Flashlight Quick Actions -->
    <g opacity="0.85" transform="translate(0, 780)">
      <!-- Flashlight -->
      <circle cx="48" cy="20" r="23" fill="${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)"}"/>
      <path d="M48,10 L48,15 M43,15 L53,15 M44,20 L52,20 L50,30 L46,30 Z" stroke="${textPrimary}" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      
      <!-- Camera -->
      <circle cx="${width - 48}" cy="20" r="23" fill="${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.05)"}"/>
      <path d="M${width - 57},14 L${width - 53},14 L${width - 51},10 L${width - 45},10 L${width - 43},14 L${width - 39},14 C${width - 37},14 ${width - 37},16 ${width - 37},16 L${width - 37},28 C${width - 37},28 ${width - 37},30 ${width - 39},30 L${width - 57},30 C${width - 59},30 ${width - 59},28 ${width - 59},28 L${width - 59},16 C${width - 59},16 ${width - 59},14 ${width - 57},14 Z" stroke="${textPrimary}" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      <circle cx="${width - 48}" cy="21" r="4.5" stroke="${textPrimary}" stroke-width="1.5" fill="none"/>
    </g>
    
    <!-- Home Bar -->
    <rect x="${width / 2 - 65}" y="856" width="130" height="5" rx="2.5" fill="${textPrimary}" opacity="0.45"/>
  `;
}
