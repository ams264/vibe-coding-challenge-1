import Database from 'better-sqlite3';
import { hashSync } from 'bcryptjs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS example (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT    NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sample (
      SampleID        INTEGER PRIMARY KEY AUTOINCREMENT,
      SampleText      TEXT    NOT NULL,
      CreatedBy       TEXT    NOT NULL,
      CreatedDate     TEXT    NOT NULL DEFAULT (datetime('now')),
      LastUpdatedBy   TEXT    NOT NULL,
      LastUpdatedDate TEXT    NOT NULL DEFAULT (datetime('now')),
      Active          INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS users (
      UserID        INTEGER PRIMARY KEY AUTOINCREMENT,
      Username      TEXT    NOT NULL UNIQUE,
      PasswordHash  TEXT    NOT NULL,
      Role          TEXT    NOT NULL DEFAULT 'user',
      CreatedDate   TEXT    NOT NULL DEFAULT (datetime('now')),
      Active        INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS EventCategory (
      EventCategoryID     INTEGER PRIMARY KEY AUTOINCREMENT,
      CategoryName        TEXT    NOT NULL,
      CategoryDescription TEXT,
      CreatedBy           TEXT    NOT NULL,
      CreatedDate         TEXT    NOT NULL DEFAULT (datetime('now')),
      LastUpdatedBy       TEXT    NOT NULL,
      LastUpdatedDate     TEXT    NOT NULL DEFAULT (datetime('now')),
      Active              INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS Department (
      DepartmentID    INTEGER PRIMARY KEY AUTOINCREMENT,
      DepartmentName  TEXT    NOT NULL,
      CreatedBy       TEXT    NOT NULL,
      CreatedDate     TEXT    NOT NULL DEFAULT (datetime('now')),
      LastUpdatedBy   TEXT    NOT NULL,
      LastUpdatedDate TEXT    NOT NULL DEFAULT (datetime('now')),
      Active          INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS Events (
      EventID           INTEGER PRIMARY KEY AUTOINCREMENT,
      EventName         TEXT    NOT NULL,
      EventDescription  TEXT,
      EventCategoryID   INTEGER REFERENCES EventCategory(EventCategoryID),
      DepartmentID      INTEGER REFERENCES Department(DepartmentID),
      CreatedBy         TEXT    NOT NULL,
      CreatedDate       TEXT    NOT NULL DEFAULT (datetime('now')),
      LastUpdatedBy     TEXT    NOT NULL,
      LastUpdatedDate   TEXT    NOT NULL DEFAULT (datetime('now')),
      Active            INTEGER NOT NULL DEFAULT 1 CHECK (Active IN (0, 1))
    );
  `);

  // Seed default users if they don't exist yet
  const seedUser = db.prepare(
    `INSERT OR IGNORE INTO users (Username, PasswordHash, Role) VALUES (?, ?, ?)`
  );
  seedUser.run('TestUser1',  hashSync('password1!', 10), 'user');
  seedUser.run('TestAdmin1', hashSync('password1!', 10), 'admin');

  // Seed Department
  const seedDepartment = db.prepare(
    `INSERT OR IGNORE INTO Department (DepartmentID, DepartmentName, CreatedBy, LastUpdatedBy) VALUES (?, ?, 'system', 'system')`
  );
  seedDepartment.run(1, 'IT');

  // Seed EventCategory
  const seedCategory = db.prepare(
    `INSERT OR IGNORE INTO EventCategory (EventCategoryID, CategoryName, CreatedBy, LastUpdatedBy) VALUES (?, ?, 'system', 'system')`
  );
  seedCategory.run(1, 'Event');
  seedCategory.run(2, 'Phrase');
  seedCategory.run(3, 'Mishap');
  seedCategory.run(4, 'Other');

  // Seed Events — 100 funny IT town hall moments
  const seedEvent = db.prepare(`
    INSERT OR IGNORE INTO Events (EventID, EventName, EventDescription, EventCategoryID, DepartmentID, CreatedBy, LastUpdatedBy)
    VALUES (?, ?, ?, ?, 1, 'system', 'system')
  `);
  const events: [number, string, string, number][] = [
    // Phrases (2)
    [1,  'Security Is Everyone\'s Responsibility', 'CIO drops the S-word within the first 60 seconds', 2],
    [2,  'We\'re Doing More With Less', 'Budget cut euphemism deployed with a straight face', 2],
    [3,  'Digital Transformation', 'Used 7+ times without a definition being offered', 2],
    [4,  'Move the Needle', 'No one knows which needle or which direction', 2],
    [5,  'Synergy', 'Invoked to explain a reorg nobody wanted', 2],
    [6,  'At the End of the Day', 'Used as a filler phrase every other sentence', 2],
    [7,  'Circle Back', 'Promised for a follow-up that will never happen', 2],
    [8,  'Boil the Ocean', 'Said dismissively about a perfectly reasonable request', 2],
    [9,  'Bandwidth', 'Used to mean capacity, time, willpower, and budget simultaneously', 2],
    [10, 'Low-Hanging Fruit', 'The fruit that has been hanging there for three fiscal years', 2],
    [11, 'Cloud-First Strategy', 'Announced for the fourth consecutive year', 2],
    [12, 'Agile Mindset', 'Said by someone who has never attended a standup', 2],
    [13, 'Fail Fast', 'Comforting words after a production outage', 2],
    [14, 'AI Will Solve That', 'Response to a question about the broken ticketing system', 2],
    [15, 'That\'s a Great Question', 'Stall tactic before a non-answer', 2],
    [16, 'Let\'s Take That Offline', 'Translation: let\'s never speak of this again', 2],
    [17, 'Our North Star', 'A metaphor presented without a compass or a map', 2],
    [18, 'Paradigm Shift', 'Announced; no paradigm was actually shifted', 2],
    [19, 'We Need to Be Proactive', 'Said reactively, after the incident', 2],
    [20, 'Blockchain Solution', 'Proposed for a problem that needed a spreadsheet', 2],
    // Mishaps (3)
    [21, 'Presenter Shares Wrong Screen', 'Personal browser tabs briefly visible to 400 employees', 3],
    [22, 'Mic on Mute', 'Speaker delivers two full minutes of passionate silence', 3],
    [23, 'Audio Feedback Loop', 'Meeting temporarily sounds like a dial-up modem', 3],
    [24, 'Video Freezes Mid-Sentence', 'Presenter locked in a deeply unflattering expression for 90 seconds', 3],
    [25, 'Cat Walks Across Keyboard', 'Entire chat is now \'asdfghjkl\'', 3],
    [26, 'Accidental Unmute in Bathroom', 'Audience learns more than expected', 3],
    [27, 'PowerPoint Crashes', 'Slide deck lost; presenter improvises for 20 minutes', 3],
    [28, 'Wrong Slide Deck Opened', 'Last quarter\'s numbers shown with full confidence', 3],
    [29, 'Desktop Wallpaper Revealed', 'Everyone now knows the CTO loves minions', 3],
    [30, 'VPN Drops Mid-Demo', 'Live demo of the disaster recovery plan begins unexpectedly', 3],
    [31, 'Fire Alarm Goes Off', 'Interpreted as a metaphor for the project status', 3],
    [32, 'Dog Barking in Background', 'Dog has opinions on the new password policy', 3],
    [33, 'Email Notification Pops on Screen', 'Subject line: RE: RE: RE: Why is this project late?', 3],
    [34, 'Screensaver Kicks In Mid-Presentation', 'Flying toasters replace the roadmap slide', 3],
    [35, 'Someone Accidentally Starts a Poll', 'Poll: How many people want to go home right now? 97% Yes', 3],
    [36, 'Presenter\'s Phone Rings', 'Ringtone: Baby Shark', 3],
    [37, 'Help Desk Ticket Submitted During Talk', 'Ticket subject: Town hall screen sharing is broken', 3],
    [38, 'Accidental Reply-All to Town Hall Invite', '400 people receive one employee\'s lunch order', 3],
    [39, 'Recording Fails Silently', 'Discovered only when someone asks for the recording link', 3],
    [40, 'Meeting Link in Invite Doesn\'t Work', 'Discovered at start time by all 400 attendees simultaneously', 3],
    [41, 'Executive\'s Kid Appears on Camera', 'Child asks why Daddy is talking to a computer again', 3],
    [42, 'Background Music from Unknown Attendee', 'Faint jazz plays throughout the security compliance segment', 3],
    [43, 'Two Presenters on Same Slide', 'Both advance at different times; chaos ensues', 3],
    [44, 'Demo Environment Is Down', 'Presenter pivots to \'imagine if this worked\'', 3],
    [45, 'Moderator Disappears During Q&A', 'Questions pile up unanswered in a digital void', 3],
    // Events (1)
    [46, 'New Password Policy Announced', 'Minimum 47 characters, rotated every Tuesday', 1],
    [47, 'Annual Security Awareness Training Reminder', 'Delivered for the 6th time this quarter', 1],
    [48, 'New Ticketing System Rollout', 'Replaces the ticketing system that replaced the old ticketing system', 1],
    [49, 'Laptop Refresh Program Announced', 'Ships in Q3... of next year', 1],
    [50, 'Cloud Migration Update', 'Phase 1 of 7 is nearly complete', 1],
    [51, 'IT Budget Cuts Announced', 'Followed immediately by slide on increased service expectations', 1],
    [52, 'New Org Chart Revealed', 'Org chart is too small to read on any screen', 1],
    [53, 'CISO Presents Threat Landscape', 'Audience collectively regrets every password choice', 1],
    [54, 'Mandatory MFA Rollout', 'Affects the one system everyone uses at 8am on Monday', 1],
    [55, 'Legacy System Sunset Announced', 'System that was already sunset twice before', 1],
    [56, 'Vendor Demo Goes Wrong', 'Vendor demo crashes; vendor blames the network', 1],
    [57, 'Network Outage Post-Mortem', 'Root cause: someone unplugged the wrong thing', 1],
    [58, 'IT Strategic Roadmap Presented', 'Roadmap extends 5 years; company plans quarterly', 1],
    [59, 'New On-Call Policy Announced', 'Boos heard from the back of the virtual room', 1],
    [60, 'Help Desk Metrics Review', '97% satisfaction shown while chat fills with complaints', 1],
    [61, 'IT Awards Ceremony', 'Award created specifically for one person who is also presenting', 1],
    [62, 'Compliance Audit Results Shared', 'Results described as \'a learning opportunity\'', 1],
    [63, 'New Software Rollout Announced', 'Replaces a tool everyone was just getting used to', 1],
    [64, 'Zero-Trust Architecture Explained', 'Audience trusts it less after the explanation', 1],
    [65, 'IT Uptime Stats Presented During Outage', '99.9% uptime slide shown; Slack is currently down', 1],
    // Other (4)
    [66, 'Bingo Card Spotted in Chat', 'Someone posts a screenshot of a filled town hall bingo card', 4],
    [67, 'Question Already on FAQ', 'Asked passionately; FAQ link shared with passive aggression', 4],
    [68, 'Same Question for Third Meeting in a Row', 'Questioner has clearly not received the memo', 4],
    [69, 'Meeting Runs 30 Minutes Over', 'Held hostage by a question about the parking lot', 4],
    [70, 'Attendance Drops by Half After 10 Minutes', 'Attendee count: 400 → 200 → 47', 4],
    [71, 'First Question Is About Parking', 'Submitted to the IT town hall with full sincerity', 4],
    [72, 'The One More Thing Takes 20 Minutes', 'The longest one more thing in recorded history', 4],
    [73, 'Three People Talk at Once', 'All three insist the others go first for a full minute', 4],
    [74, 'Someone Dials In from a Restaurant', 'Order of fries audible throughout Q&A', 4],
    [75, 'Manager References Meme Incorrectly', 'This is fine meme used to describe a success story', 4],
    [76, 'Someone Reads Chat Out Loud by Accident', 'Includes a comment about the presenter\'s hair', 4],
    [77, 'Attendee Falls Asleep on Camera', 'Becomes a Zoom background for next meeting', 4],
    [78, 'Someone Joins from a Moving Car', 'Scenery more interesting than the roadmap', 4],
    [79, 'Q&A Queue Has 47 Questions with 2 Minutes Left', 'Host says \'we\'ll get to those via email\'', 4],
    [80, 'Executive Uses Wrong Acronym Confidently', 'SLA redefined as Software Llama Agreement', 4],
    [81, 'IT Ticket Submitted in the Chat Window', '\'Ticket #: my mic is broken\' sent to all 400 attendees', 4],
    [82, 'Someone Asks If This Could Have Been an Email', 'Standing ovation in the chat', 4],
    [83, 'The We\'ll Follow Up Counter Hits 10', 'Audience starts keeping a tally in the chat', 4],
    [84, 'Chat Fills With Can You Hear Me', 'Sixty-three sequential \'can you hear me\' messages', 4],
    [85, 'Wrong Timezone on Invite', 'Half the team joins an hour early; half miss it entirely', 4],
    [86, 'Applause Emoji Spam', 'Chat becomes a wall of 👏 for three full minutes', 4],
    [87, 'Post-Meeting Survey Link Is Broken', 'Irony appreciated by IT professionals everywhere', 4],
    [88, 'Someone in Meeting Doesn\'t Know They\'re in Meeting', 'Surprised face captured in screenshot forever', 4],
    [89, 'Very Long Silence After Any Questions', 'Silence so long it loops back to awkward', 4],
    [90, 'Any Final Questions Triggers 15 More Questions', 'Meeting end time becomes theoretical', 4],
    [91, 'New System Requires Internet Explorer', 'Announced without apparent awareness of irony', 4],
    [92, 'CIO Mispronounces Kubernetes', 'A new pronunciation is coined: Koo-ber-NET-eez', 4],
    [93, 'IT Director Uses Sent from My iPhone Signature', 'In a presentation about enterprise mobility strategy', 4],
    [94, 'Someone Screenshots the Attendance List', 'Uses it as leverage in a future meeting', 4],
    [95, 'Two Departments Claim Ownership of Same System', 'Argument diplomatically described as \'alignment needed\'', 4],
    [96, 'Someone Asks a Question Answered 5 Minutes Ago', 'Answered again with measurably less enthusiasm', 4],
    [97, 'Presenter Accidentally Closes Presentation', 'Desktop briefly visible; everyone pretends not to notice', 4],
    [98, 'Town Hall Recording Shared to Wrong Distribution List', 'Finance team now has opinions about IT roadmap', 4],
    [99, 'The Entire Chat Is Just One GIF', 'A single This Is Fine GIF reblogged 200 times', 4],
    [100,'Someone Asks When the Next Town Hall Is', 'Asked with the energy of someone who enjoys this', 4],
  ];
  for (const [id, name, desc, catId] of events) {
    seedEvent.run(id, name, desc, catId);
  }
}
