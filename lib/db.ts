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

    CREATE TABLE IF NOT EXISTS Games (
      GameID      INTEGER PRIMARY KEY AUTOINCREMENT,
      UserID      INTEGER NOT NULL REFERENCES users(UserID),
      GridJSON    TEXT    NOT NULL,
      MarkedJSON  TEXT    NOT NULL DEFAULT '[12]',
      Status      TEXT    NOT NULL DEFAULT 'in_progress' CHECK (Status IN ('in_progress', 'complete')),
      CreatedDate TEXT    NOT NULL DEFAULT (datetime('now')),
      UpdatedDate TEXT    NOT NULL DEFAULT (datetime('now')),
      Active      INTEGER NOT NULL DEFAULT 1
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

  // Add DepartmentID to users if this is an older DB without it
  try {
    db.exec('ALTER TABLE users ADD COLUMN DepartmentID INTEGER REFERENCES Department(DepartmentID)');
  } catch { /* column already exists — ignore */ }

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
  seedDepartment.run(2, 'Accounting');
  seedDepartment.run(3, 'Marketing');

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

  // Seed Events — 100 Accounting town hall moments (DepartmentID = 2)
  const seedEventWithDept = db.prepare(`
    INSERT OR IGNORE INTO Events (EventID, EventName, EventDescription, EventCategoryID, DepartmentID, CreatedBy, LastUpdatedBy)
    VALUES (?, ?, ?, ?, ?, 'system', 'system')
  `);

  const accountingEvents: [number, string, string, number, number][] = [
    // Phrases (2)
    [101, 'We Need to Reconcile That',           'Said about something that will never actually be reconciled', 2, 2],
    [102, 'That\'s Not in the Budget',           'Delivered with the finality of a supreme court ruling', 2, 2],
    [103, 'Let\'s Look at the Variance',         'Spoiler: the variance is bad', 2, 2],
    [104, 'EBITDA',                              'Said three times before anyone asks what it means', 2, 2],
    [105, 'Cash Flow Positive',                  'Announced as if it\'s an unexpected miracle', 2, 2],
    [106, 'Burn Rate Is Concerning',             'Delivered in a tone that means \'someone is getting a talking to\'', 2, 2],
    [107, 'We Need to Amortize That',            'Used to defer a problem to future accountants', 2, 2],
    [108, 'Accrual Basis Accounting',            'Invoked to end a debate that nobody wanted to have', 2, 2],
    [109, 'Year-End Close Is Coming',            'Said with the dread of an approaching meteor', 2, 2],
    [110, 'Audit Season',                        'The two words that silence an entire room', 2, 2],
    [111, 'Material Weakness',                   'Phrase used; nobody elaborates further', 2, 2],
    [112, 'Working Capital Constraints',         'Finance speak for \'we are out of money\'', 2, 2],
    [113, 'Accounts Receivable Is Aging',        'Like milk in the sun', 2, 2],
    [114, 'Q4 Push',                             'The annual tradition of pretending targets are still achievable', 2, 2],
    [115, 'ROI on That Investment',              'Asked about the coffee machine', 2, 2],
    [116, 'Favourable Variance',                 'The one slide everyone actually applauds', 2, 2],
    [117, 'Depreciation Schedule',               'Fifteen-minute tangent nobody requested', 2, 2],
    [118, 'Run Rate',                            'The number that makes this year look better than it is', 2, 2],
    [119, 'Bridge the Gap',                      'Between actuals and wishful thinking', 2, 2],
    [120, 'Deferred Revenue Recognition',        'Explaining why great sales don\'t show up this quarter', 2, 2],
    [121, 'We\'re Tracking to Budget',           'Said in January; never repeated again', 2, 2],
    [122, 'P&L Impact',                          'The phrase that makes every decision suddenly complicated', 2, 2],
    [123, 'Cut a Check',                         'Said by someone who hasn\'t seen a physical check since 2009', 2, 2],
    [124, 'Line Item Issue',                     'Translation: someone spent money they shouldn\'t have', 2, 2],
    [125, 'Let\'s Take That to the Numbers Team','Meaning: let\'s make this someone else\'s problem', 2, 2],
    // Mishaps (3)
    [126, 'Calculator Battery Dies Mid-Presentation', 'Presenter stares at blank screen; recalculates by hand incorrectly', 3, 2],
    [127, 'Excel Shows #REF! on the Main Slide',  'The formula has been broken since last quarter; nobody noticed', 3, 2],
    [128, 'Wrong Fiscal Year on Every Slide',     'Entire presentation is technically for a different year', 3, 2],
    [129, 'CFO Shares Personal Spreadsheet',      'Includes a tab labelled \'house budget DO NOT OPEN\'', 3, 2],
    [130, 'Finance System Goes Down Live',        'During the one demo the auditors are watching', 3, 2],
    [131, 'Circular Reference Crashes the Model', 'Took three hours to build; crashes in three seconds', 3, 2],
    [132, 'Printer Jams on Report Day',           '200 people waiting; one paper jam between them and the numbers', 3, 2],
    [133, 'Wrong Decimal Makes Revenue 10x Higher','Exciting for thirty seconds; devastating for thirty minutes', 3, 2],
    [134, 'Last Year\'s Actuals Presented as Forecast', 'Numbers look suspiciously familiar because they are', 3, 2],
    [135, 'Personal Tax Return Briefly Visible',  'Screen share ends; awkward silence begins', 3, 2],
    [136, 'Excel Crashes After 45-Minute Build-Up','No save. No backup. No words.', 3, 2],
    [137, 'Projector Too Blurry to Read Numbers', 'Everyone nods and pretends they can see the figures', 3, 2],
    [138, 'Budget Model Has PLACEHOLDER Text',    'On the slide being shown to the board', 3, 2],
    [139, 'CFO Mutes Himself for the Key Slide',  'Mouths the most important number of the quarter silently', 3, 2],
    [140, 'Video Freezes Before the Big Reveal',  'Presenter frozen mid-smug-smile for ninety seconds', 3, 2],
    [141, 'Whiteboard Has Last Quarter\'s Write-Offs', 'Meeting starts; everyone reads the bad news before it\'s announced', 3, 2],
    [142, 'Data Pasted from Wrong Tab',           'The sandbox numbers are now the official presentation', 3, 2],
    [143, 'Chart Y-Axis Starts at Non-Zero',      'A 1% gain looks like a tripling of revenue', 3, 2],
    [144, 'Pivot Table Collapses Live',           'Three weeks of work gone; presenter acts casual', 3, 2],
    [145, 'Conference Line Echo Garbles Numbers', 'Fourteen million or forty million: the jury is out', 3, 2],
    [146, 'Someone Types in a Cell During Share', 'Accidentally edits the master budget; everyone watches', 3, 2],
    [147, 'Budget File Named final_v2_ACTUAL_final3', 'Displayed prominently in the window title bar', 3, 2],
    [148, 'Copy-Paste Corrupts the Pivot Table',  'Email formatting strikes again', 3, 2],
    [149, 'Macro Deletes a Column on Screen',     'Presenter says \'that\'s supposed to happen\'; it is not', 3, 2],
    [150, 'Two Reports Show Different Totals',    'Same data; same period; different universe apparently', 3, 2],
    // Events (1)
    [151, 'Annual Budget Review',                 'The meeting that makes everyone question their career choices', 1, 2],
    [152, 'Audit Committee Update',               'Delivered with the energy of someone defusing a bomb', 1, 2],
    [153, 'Year-End Close Timeline Announced',    'Dates circled in red; team silently mourns their weekends', 1, 2],
    [154, 'New Expense Policy Rollout',           'Three pages of rules about $8 sandwiches', 1, 2],
    [155, 'ERP System Upgrade Announced',         'Will be seamless; will absolutely not be seamless', 1, 2],
    [156, 'Quarterly Earnings Preview',           'The rehearsal for delivering bad news professionally', 1, 2],
    [157, 'New Chart of Accounts Announced',      'Everyone\'s bookmarks are now wrong', 1, 2],
    [158, 'Expense Reimbursement Policy Change',  'Reimbursement ceiling lowered; ceiling on frustration raised', 1, 2],
    [159, 'New AP/AR System Demo',                'Demo works flawlessly; production will not', 1, 2],
    [160, 'SOX Compliance Training Reminder',     'Annual tradition of pretending this is new information', 1, 2],
    [161, 'Budget Freeze Announced',              'In the same breath as an ambitious growth target', 1, 2],
    [162, 'New CFO Introduction',                 'Mentions \'fresh eyes\' and \'rightsizing\'; room goes quiet', 1, 2],
    [163, 'Financial Restatement Update',         'Presented with very careful word choices', 1, 2],
    [164, 'Cost Reduction Initiative Launched',   'Renamed from \'layoffs\' for presentation purposes', 1, 2],
    [165, 'New T&E Platform Demo',                'Requires a 12-step process to submit a $5 parking receipt', 1, 2],
    [166, 'Internal Audit Findings Shared',       'Preceded by a long pause and a sip of water', 1, 2],
    [167, 'Procurement Policy Overhaul',          'Three new approval layers added; zero removed', 1, 2],
    [168, 'New Capitalization Threshold Announced','Affects eighteen people; twelve of them are in this room', 1, 2],
    [169, 'Month-End Close Checklist Review',     'Goes over time because someone always misses step seven', 1, 2],
    [170, 'Intercompany Reconciliation Update',   'Will be resolved \'by end of next week\' for the twelfth week running', 1, 2],
    [171, 'Fixed Asset Inventory Results',        'Three servers unaccounted for; one found in a broom closet', 1, 2],
    [172, 'New Banking Relationship Announced',   'Old bank not named; everyone already knows', 1, 2],
    [173, 'Revenue Recognition Policy Change',    'Same revenue; different quarter; accountants pleased', 1, 2],
    [174, 'Headcount Freeze Confirmed',           'Backfills denied; workloads unchanged; smiles mandatory', 1, 2],
    [175, 'Controller Announces New Close Calendar','Weekend close dates quietly added; nobody celebrates', 1, 2],
    // Other (4)
    [176, 'Expense Report from February Still Pending', 'Submitted before winter; still in limbo', 4, 2],
    [177, '"Not in Budget" Said 12 Times',         'Someone starts counting on a notepad', 4, 2],
    [178, 'Debate Over a $12 Lunch Receipt',      'Forty minutes; no resolution; principles upheld', 4, 2],
    [179, 'Someone Still Submits Paper Expense Reports', 'Faxed in, apparently', 4, 2],
    [180, 'Color Printer Usage Policy Mentioned', 'The same person always responsible; they know who they are', 4, 2],
    [181, 'Parking Stipend Question Derails Agenda', 'Was not on the agenda; is now the entire agenda', 4, 2],
    [182, 'Standing Desk Request Triggers Budget Speech', 'Four-minute speech about fiscal responsibility over a $400 desk', 4, 2],
    [183, 'The Fax Machine Is Referenced Unironically', 'Used for official documents; nobody questions this', 4, 2],
    [184, 'Someone Found a 2019 Discrepancy',     'They have been waiting four years for this moment', 4, 2],
    [185, '"Can We Just Use Excel?" Asked About SAP', 'About a $2M enterprise system', 4, 2],
    [186, 'Budget Model Tab Named "DO NOT TOUCH"','Someone touched it', 4, 2],
    [187, 'Three People Claim the Same Conference Expense', 'Each has a receipt; math does not add up', 4, 2],
    [188, 'Physical Calculator Brought to Digital Meeting', 'Batteries included; software excluded', 4, 2],
    [189, 'Collective Sigh at "Manual Process"',  'A room full of accountants sharing one pain', 4, 2],
    [190, 'Holiday Party Budget Question',        'Asked in February; answered in October; ignored in December', 4, 2],
    [191, 'P&L Font Too Small to Read',           'Presented on a 60-inch screen; still unreadable', 4, 2],
    [192, 'Coffee as a Business Expense Debate',  'Philosophical debate with real dollar implications', 4, 2],
    [193, 'New Hire Asks About the 2003 System',  'Veteran staff look at floor; topic changed quickly', 4, 2],
    [194, '$0.50 Expense With a Full Justification', 'Longer than most business cases for six-figure projects', 4, 2],
    [195, '"Can We Get a Budget Increase?" Laughed At', 'Not cruelly; just reflexively', 4, 2],
    [196, 'Audible Sighing When Headcount Freeze Confirmed', 'One long sigh; then silence; then a question about parking', 4, 2],
    [197, '"Revisit in Q1" Said in Q4 Again',     'Fifth consecutive year; Q1 never revisits it', 4, 2],
    [198, 'Someone Prints the 200-Page Report',   'Double-sided; still a ream of paper; brought in a tote bag', 4, 2],
    [199, 'The Only Person Who Knows the Legacy System Is Retiring', 'Announcement made; nobody breathes', 4, 2],
    [200, 'Free Snacks Question Gets Real Traction','Longest applause of the meeting', 4, 2],
  ];
  for (const [id, name, desc, catId, deptId] of accountingEvents) {
    seedEventWithDept.run(id, name, desc, catId, deptId);
  }

  // Seed Events — 100 Marketing town hall moments (DepartmentID = 3)
  const marketingEvents: [number, string, string, number, number][] = [
    // Phrases (2)
    [201, 'Brand Awareness',                     'The metric used when every other metric is bad', 2, 3],
    [202, 'Move the Needle on Engagement',        'The needle has not moved; the goalposts have', 2, 3],
    [203, 'Content Is King',                     'Said while presenting content that is clearly a peasant', 2, 3],
    [204, 'Omnichannel Strategy',                'Means being bad at seven platforms instead of one', 2, 3],
    [205, 'Authentic Storytelling',              'About a product that was designed by committee', 2, 3],
    [206, 'Growth Hacking',                      'Used unironically by someone over forty', 2, 3],
    [207, 'Viral Moment',                        'Requested as a deliverable with a hard deadline', 2, 3],
    [208, 'Data-Driven Decision Making',         'Said; PowerPoint contains zero data', 2, 3],
    [209, 'Customer Journey Mapping',            'Map revealed; nobody agrees on where the customer actually is', 2, 3],
    [210, 'We Need to Be More Agile',            'Said by someone who has blocked every quick decision this quarter', 2, 3],
    [211, 'Our Messaging Needs to Pop',          'Specific feedback; no actionable direction', 2, 3],
    [212, 'Full-Funnel Approach',                'Top of funnel leaking; bottom of funnel on fire', 2, 3],
    [213, 'ABM Strategy',                        'Explained for fifteen minutes; still unclear who the accounts are', 2, 3],
    [214, 'Net Promoter Score',                  'Presented with confidence; methodology quietly buried', 2, 3],
    [215, 'Thought Leadership Content',          'Blog post; nobody read it; three people shared it on LinkedIn', 2, 3],
    [216, 'We Need to Go Viral',                 'Budget: $500. Expectation: Super Bowl', 2, 3],
    [217, 'Persona-Based Marketing',             'Personas named after people nobody on the team has met', 2, 3],
    [218, 'SEO-Optimized',                       'Means the title has the keyword in it; once', 2, 3],
    [219, 'We\'re Building a Community',         'LinkedIn page with 47 followers; mostly employees', 2, 3],
    [220, 'Share of Voice',                      'Metric used when share of market is embarrassing', 2, 3],
    [221, 'Influencer Partnership',              '$10K paid; three posts; audience of 200 bots', 2, 3],
    [222, 'Marketing Qualified Lead',            'Definition changes every quarter to hit the target', 2, 3],
    [223, 'Attribution Model',                   'Last-touch until last-touch looks bad; then multi-touch', 2, 3],
    [224, 'We Need a Hero Asset',                'The hero asset takes six months; launches the week the campaign ends', 2, 3],
    [225, 'Demand Generation',                   'Generating demand for an explanation of demand generation', 2, 3],
    // Mishaps (3)
    [226, 'Campaign Launches With Headline Typo', 'Seen by 80,000 people before anyone notices', 3, 3],
    [227, 'Wrong Brand Colors Throughout Deck',   'The old hex codes; presentation to the brand committee', 3, 3],
    [228, 'Competitor\'s Logo Appears on Slide',  'Presented as an example of \'what not to do\'; it is your logo', 3, 3],
    [229, 'Company Post Sent from Personal Account','Opinion about the merger; sent to 40K followers', 3, 3],
    [230, 'Wrong CTA Link in Email to 50,000 People', 'Links to the homepage; campaign page never tested', 3, 3],
    [231, '"Test" Email Sent to Full Customer List', 'Subject: TEST DO NOT SEND. Sent.', 3, 3],
    [232, 'Stock Photo Person in Competitor\'s Ad', 'Spotted by an intern during the campaign launch celebration', 3, 3],
    [233, 'Designer\'s Layer Notes Visible in PDF', 'Layer named "client hates this version" exported', 3, 3],
    [234, 'Campaign Video Plays With No Audio',   'Ninety seconds of a silent inspirational montage', 3, 3],
    [235, 'Unapproved Logo Shown',               'The one that lost in the vote by a landslide', 3, 3],
    [236, 'Metrics Pulled from Wrong Date Range', 'Great numbers; wrong campaign; wrong quarter; wrong year', 3, 3],
    [237, 'Last Quarter\'s Campaign Presented as Current', 'Same results; different date on the cover slide', 3, 3],
    [238, 'Confidential Watermark Missing',       'Competitive analysis deck sent to a partner without it', 3, 3],
    [239, 'Legal-Unapproved Ad Creative Shown',  'Legal is on the call; creative team did not know', 3, 3],
    [240, 'Canva Opened Instead of Final Export', 'All the guides and unfinished elements visible to the board', 3, 3],
    [241, 'Animated GIF Broken in Presentation', 'The centerpiece of the campaign is a frozen jpeg', 3, 3],
    [242, 'Brand Font Not Installed on Laptop',  'Helvetica standing in for a typeface we paid $4,000 for', 3, 3],
    [243, 'Social Dashboard Shows Live Failure',  'Scheduled post from three weeks ago finally fires mid-meeting', 3, 3],
    [244, 'Wrong Tagline Version on Every Slide', 'The one that was retired in 2021', 3, 3],
    [245, 'Campaign Launch Date Already Passed',  'Timeline slide confidently shows a date from last month', 3, 3],
    [246, 'Comment Bubbles Visible in Design File','One says \'does anyone actually like this?\'', 3, 3],
    [247, 'Slack Notification Pops With Campaign Critique', 'From someone who is also in the meeting', 3, 3],
    [248, 'Case Study Uses a Churned Client',     'Discovered live when someone checks the CRM', 3, 3],
    [249, 'Email Preview Shows Raw HTML',         'Entire template tag soup displayed as copy', 3, 3],
    [250, 'Sentiment Analysis Contradicts Presenter', 'Dashboard says negative; presenter says \'phenomenal response\'', 3, 3],
    // Events (1)
    [251, 'Quarterly Campaign Performance Review', 'Where hope goes to be measured and found lacking', 1, 3],
    [252, 'New Brand Guidelines Rollout',          'Forty-page PDF; three people will read it; none will follow it', 1, 3],
    [253, 'Product Launch Plan Presented',         'Six months of work; seven stakeholder revisions; one typo on slide one', 1, 3],
    [254, 'Agency Pitch Review',                   'Four agencies; four identical slide decks; four uses of \'authentic\'', 1, 3],
    [255, 'New CRM Platform Announced',            'Will unify all data; will create all new data problems', 1, 3],
    [256, 'Annual Marketing Planning Session',     'Where last year\'s goals become this year\'s stretch goals', 1, 3],
    [257, 'Social Media Strategy Overhaul',        'New platform added; old platform \'deprioritised\' not abandoned', 1, 3],
    [258, 'New Content Calendar Introduced',       'Color-coded; complex; abandoned by week three', 1, 3],
    [259, 'Website Redesign Kickoff',              'Estimated at three months; will take eleven', 1, 3],
    [260, 'Customer Survey Results Shared',        'Net Promoter Score disclosed; methodology footnoted in size-6 font', 1, 3],
    [261, 'New MarTech Stack Announced',           'Replaces three tools; requires five new ones to integrate them', 1, 3],
    [262, 'Rebranding Initiative Unveiled',        'Logo described as \'evolved\'; it is the same logo, slightly rounder', 1, 3],
    [263, 'Influencer Program Launch',             'Micro-influencers; macro-budget; nano-results', 1, 3],
    [264, 'Event Marketing Recap',                 'Booth traffic: strong. Leads: \'we\'re still qualifying\'', 1, 3],
    [265, 'SEO Audit Results Presented',           'Domain authority down; explanation up; action items vague', 1, 3],
    [266, 'Email Marketing Benchmark Review',      'Open rates up; click rates down; unsubscribes not mentioned', 1, 3],
    [267, 'New Campaign Naming Convention Policy', 'Twelve-part naming string required for a single A/B test', 1, 3],
    [268, 'Competitive Positioning Update',        'We are \'uniquely positioned\'; so is every competitor slide', 1, 3],
    [269, 'New Attribution Model Rollout',         'Previous model made marketing look bad; this one does not', 1, 3],
    [270, 'Budget Allocation by Channel Review',   'Everyone defends their channel; nobody cuts their own budget', 1, 3],
    [271, 'Customer Advocacy Program Launch',      'Three customers signed up; all three are the same person', 1, 3],
    [272, 'New Video Production Process Announced','Adds four approval gates; removes one creative', 1, 3],
    [273, 'Marketing and Sales Alignment Initiative', 'Eighth alignment initiative this year; first eight didn\'t align', 1, 3],
    [274, 'Demand Gen Funnel Metrics Review',      'MQLs up; SQLs flat; sales blames marketing; marketing blames sales', 1, 3],
    [275, 'Analyst Relations Strategy Presented',  'Slides about slides we will send to analysts who may or may not read them', 1, 3],
    // Other (4)
    [276, '"Make the Logo Bigger" Suggested',      'By the same person who suggested it last quarter', 4, 3],
    [277, 'Debate Over Whether a Meme Is On Brand', 'Twenty minutes; no consensus; meme posted anyway', 4, 3],
    [278, 'Designer Visibly Pained by Font Suggestion', 'Comic Sans mentioned; designer reaches for water', 4, 3],
    [279, '"Can We Just Boost It?" Asked',         'About an organic post with 12 likes', 4, 3],
    [280, 'TikTok Campaign Idea From Senior Leader','Described as \'what the kids are doing\'; trend is from 2021', 4, 3],
    [281, '"Make It Pop" Stakeholder Appears',     'No further direction given; \'pop\' undefined', 4, 3],
    [282, 'QR Code Enthusiasm Resurfaces',         'Someone saw a QR code at a restaurant and got inspired', 4, 3],
    [283, '"Synergy" in a Creative Brief',         'No one wrote it; somehow it got there', 4, 3],
    [284, 'Digital Brochure Printed for Meeting',  'The one with the animated GIF that obviously doesn\'t work on paper', 4, 3],
    [285, '"Can We Go Viral?" as a Budget Item',   'Line item: Virality. Amount: $200', 4, 3],
    [286, 'Three People Claim the Campaign Win',   'Different campaign; different metric; same credit', 4, 3],
    [287, 'ROI of Brand Awareness Questioned',     'No answer given; question declared \'outside the scope\'', 4, 3],
    [288, 'Brand Color Debate Reignites',          'Settled in 2022; re-litigated with fresh conviction', 4, 3],
    [289, 'Comic Sans Suggested Ironically',       'Implemented unironically by someone in the meeting', 4, 3],
    [290, 'Sales Takes Credit for Marketing Win',  'Marketing takes credit for sales win; balance restored', 4, 3],
    [291, '"Add More Text to the Billboard" Requested', 'Fourteen words suggested; the speed limit is 65mph', 4, 3],
    [292, 'Why Aren\'t We on That Platform Yet',   'Platform specified; platform is six months old', 4, 3],
    [293, 'New Hire Asks About the 2015 Website',  'Everyone looks at the person responsible; they look at the ceiling', 4, 3],
    [294, '"The Gram" Used Without Irony',         'By a VP in a formal strategy presentation', 4, 3],
    [295, 'Agency Comes In 40% Over Budget',       'Described in the invoice as \'scope expansion\'', 4, 3],
    [296, '47-Slide Deck for a 20-Minute Slot',    'Speaker committed to all 47; meeting ends after slide 12', 4, 3],
    [297, 'Sponsoring Every Conference Proposed',  'Budget reviewed; proposal quietly shelved', 4, 3],
    [298, 'That One Creative Who Gets Every Reference', 'Laughs alone; explains nothing; carries the culture', 4, 3],
    [299, 'More Stock Photos Than Real Customers', 'Thirty-two images of people laughing at laptops; zero testimonials', 4, 3],
    [300, '"Just Do What Apple Does" Suggested',   'Apple\'s marketing budget noted; suggestion withdrawn', 4, 3],
  ];
  for (const [id, name, desc, catId, deptId] of marketingEvents) {
    seedEventWithDept.run(id, name, desc, catId, deptId);
  }
}
