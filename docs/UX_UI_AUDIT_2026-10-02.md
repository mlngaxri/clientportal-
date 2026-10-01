# Fourthform UX and UI audit

**Review date:** 2 October 2026, Australia/Brisbane  
**Scope:** Marketing, 20 studio concepts, four independent preview spaces, preview onboarding, connected client portal, customer website, agency controls and failure states.  
**Purpose:** Identify what to improve. This review does not change the product UI.

## The judgment

Fourthform has a coherent visual foundation: the four-corner mark, warm paper surfaces, restrained colour, large editorial typography and clear separation between a website project and everyday content management. The current marketing design is worth refining, rather than replacing.

The experience is not finalized. The most consequential gaps are deployment, trustworthy demo-to-product continuity, phone usability, payment and authentication recovery, and making the consequences of saving, submitting, approving and publishing unmistakable. Additional decorative motion should follow those improvements.

This is a detailed heuristic and source review, supported by CI screenshots. It is not a usability study, accessibility certification, performance benchmark or Awwwards assessment.

## Evidence and limits

The two live addresses were opened in the browser during this review:

- [Marketing](https://fourthform-marketing.vercel.app/) displays a stable Vercel placeholder headed **Marketing Website**.
- [Client portal](https://fourthform-client-portal.vercel.app/) displays a stable Vercel placeholder headed **Client Portal**.

Neither live address exposes the current repository interface. The placeholder text says specialist builders will replace it. Therefore, findings about the full interfaces below come from source and verified build evidence, not a fresh interaction with those interfaces on the public URLs.

The source snapshot comprises 100 files across both projects. Relevant code, styles, route logic, service boundaries, copy for all 20 concepts and schema contracts were inspected.

| Source | Audited revision | Visual evidence |
| --- | --- | --- |
| [Marketing repository](https://github.com/mlngaxri/marketingwebsite-) | `b81e1d4d47259a8465814629666d96b719014a15` | [Successful workflow 36867211316](https://github.com/mlngaxri/marketingwebsite-/actions/runs/36867211316), artifact `preview-verification` |
| [Portal repository](https://github.com/mlngaxri/clientportal-) | `4fb682e878113d76ac8e146604c1d291dbc5aa32` | [Successful connected workflow 36869116368](https://github.com/mlngaxri/clientportal-/actions/runs/36869116368), artifact `connected-system-evidence`, produced at `65309ac89325acc9801062c4572ddc6dbc7f805a` |

The latest portal revision also focuses the route-error heading for keyboard recovery. That existing fix is preserved in this audit. The connected screenshots precede that small fix.

The evidence includes desktop marketing, phone marketing, pricing, embedded previews, phone review, phone States, portfolio dialogs, onboarding, connected review, connected phone navigation/settings and a published customer page. The connected test report records 23 passing flow checks and no uncaught errors. Its payment boundary explicitly states that administrator test receipts exercised payment transitions. It does not establish live Stripe, Google, custom-domain or production email acceptance.

### Labels

- **P0:** Blocks the public experience.
- **P1:** Correct before taking real customers through the affected journey.
- **P2:** Substantial clarity, usability or visual refinement.
- **P3:** Optional finishing detail.
- **C:** Confirmed from source.
- **V:** Visible in verified screenshots or directly observed live.
- **R:** Recommended improvement based on the existing design.
- **T:** A specific validation need, not a confirmed failure.

An acceptance check below is a proposed completion criterion. It is not a claim that the fix has been implemented or tested.

## What should remain

- Keep the four-corner motif and the Geist/Instrument Serif pairing. They give the agency and portal a recognizable relationship.
- Keep portfolio work honestly labelled as studio concepts and fictional businesses. Do not replace that disclosure with invented client results.
- Keep independent demo drafts and the ability to explore without a forced tour.
- Keep the distinction between saving a draft, sending an Initial Direction and consuming a revision round.
- Keep real save receipts, upload validation, local board recovery, version conflicts, immutable submitted revisions, withdrawal before work starts, published history and authoritative payment confirmation.
- Keep native dialogs, visible focus styles and the existing reduced-motion handling.
- Keep the clear A$200/A$1,300 split for Site and the absence of card collection in the public demo.

## The first work to prioritize

| Order | Work | Why |
| --- | --- | --- |
| 1 | Serve the actual verified applications on the two public URLs | At present the visitor cannot experience the product |
| 2 | Fix Google request validation, First checkout scope and unfinished-project routing | These can prevent or misdirect an intended purchase |
| 3 | Make payment return states explicit | A paid customer must never be left guessing whether to pay again |
| 4 | Repair phone demo chrome and use a phone-sized review canvas by default | The main product demonstration currently becomes hard to read and use |
| 5 | Make States activation deliberate and separate invalid editing from saving | Editing a schedule should not silently alter live content |
| 6 | Extend draft recovery and conflict handling to Pages, Search and Settings | The reassuring draft language must match actual preservation |
| 7 | Resolve demo/connected feature and visual differences | The preview should set an accurate expectation |
| 8 | Improve next-step summaries, navigation and transaction language | Clients should know what needs their attention |
| 9 | Complete commercial scope, human credibility and contact information | Visitors need enough information to make a confident decision |
| 10 | Finish accessibility, motion, responsive and performance acceptance on staging | CI screenshots alone do not establish the full experience |

## Detailed findings

### Public release and product continuity

#### UX-001 | The live destinations are placeholders
**P0 · V**

**Evidence:** Both public URLs show build-target placeholder pages rather than the marketing site and connected portal.

**Impact:** All work on persuasion, previews and portal usability is unavailable to actual visitors. The placeholder's internal builder message also communicates an unfinished service.

**Change:** Publish the tested applications to the intended projects and verify the domain mapping. Until a real transactional journey is configured, make the available public action an explicitly labelled preview.

**Acceptance:** Open both addresses in a clean browser session. Marketing shows the current design; client access shows the intended account entry. Work, previews and entry links resolve to the correct application. No builder placeholder appears.

#### UX-002 | Establish an explicit demo-to-connected parity contract
**P1 · C/V/R**

**Evidence:** The public demo and connected app use separate renderers. The demo has a search-result preview, reservation metrics, card details, consent controls and richly illustrated workspaces. The current connected app offers different metrics, simpler connection fields and different layouts.

**Impact:** A visitor can choose Fourthform based on a feature or interaction that changes substantially after signing in.

**Change:** Use the parity table later in this report to align terminology, consequences and available functionality. Retain simulated examples, but label integrations and illustrative metrics accurately. Prefer shared components where practical.

**Acceptance:** For every preview control, identify its connected equivalent or an explicit boundary. A first-time client can perform the same advertised task after purchase without relearning its meaning.

#### UX-003 | Show real service availability before inviting a blocked action
**P1 · C/R**

**Evidence:** Onboarding exposes general configuration availability; Google has a separate provider dependency. Checkout and account email have additional configuration boundaries. Settings offers notification preferences while its text explains that delivery depends on the sending service.

**Impact:** Users can attempt an action only to discover that the agency cannot currently provide it.

**Change:** Expose concise capability states such as account available, checkout available, Google available and email notification active. Disable or replace unavailable actions with a useful next step. Keep service configuration details in the agency interface.

**Acceptance:** A deliberately unconfigured staging service produces a clear unavailable state before submission. The message offers a working alternative where one exists. Saving a notification preference is not presented as proof that email delivery works.

### Marketing comprehension and purchasing confidence

#### UX-004 | Align “Start a site” with the destination
**P1 · C/R**

**Evidence:** `startHref()` routes to `/preview/start` unless the connected-portal flag is enabled. The first-screen CTA still says “Start a site”; the explanation that it is a preview appears much later.

**Impact:** A visitor may believe they are entering a real onboarding or purchase journey, then encounter a simulated account step.

**Change:** While preview mode is active, use “Try the brief” or “Explore the portal” with adjacent “Example project. No account or payment.” Once connected onboarding is available, restore the real purchase wording.

**Acceptance:** Before clicking, a visitor can correctly predict whether the next action creates an account, starts a brief or opens a demo.

#### UX-005 | Distinguish the portal demonstration from client sign-in
**P2 · C/V**

**Evidence:** Desktop navigation includes both “Portal” and “Client portal”. One is a section anchor and the other leads to the separate portal address.

**Impact:** Two similar labels require users to infer a distinction that the interface can state directly.

**Change:** Use “Try the portal” for the demonstration and “Client sign-in” for account access. Consider moving States into the product explanation rather than treating it as an equal navigation destination.

**Acceptance:** A new visitor and an existing client choose their respective destination without trying both links.

#### UX-006 | Finish the commercial scope around the price
**P1 · C/R**

**Evidence:** Price, page count and revision count are clear. The current page does not sufficiently explain delivery timing, content responsibilities, ongoing hosting arrangements, support, ownership/handover, exclusions and how scope changes are handled.

**Impact:** “A$1,500 once” and “Core included” leave important purchasing questions unresolved.

**Change:** Add a compact scope summary and linked service terms. Define what the client supplies, what the agency supplies, when work can begin and what ongoing costs or limits apply. These promises require the agency's actual policies; do not invent them.

**Acceptance:** A prospect can describe the total commitment, what is included, what is extra and what happens after launch without needing to infer policy from the pricing table.

#### UX-007 | Add human credibility alongside fictional concepts
**P2 · C/R**

**Evidence:** The work is correctly identified as studio concepts. The page does not explain who operates Fourthform or provide comparable human evidence of delivery reliability.

**Impact:** Strong art direction demonstrates taste, but a buyer also needs confidence in the people who will deliver the work.

**Change:** Add a concise founder/team introduction, an authentic process example and real client outcomes when available. Use real information and permissioned evidence rather than invented testimonials or numbers.

**Acceptance:** A visitor can identify who is responsible for the project and how communication and delivery work.

#### UX-008 | Give uncertain buyers a low-commitment contact route
**P2 · C/R**

**Evidence:** The homepage repeatedly offers “Start a site” but does not provide a clear agency enquiry/contact route.

**Impact:** A buyer with one scope question must start onboarding or leave.

**Change:** Add “Ask about your project” near scope/pricing and a working contact destination in the footer. Set response expectations only if the agency can honour them.

**Acceptance:** Someone who is not ready to create an account can ask a question from both desktop and phone in one obvious step.

#### UX-009 | Explain product terms at the point of decision
**P2 · C/R**

**Evidence:** “Core included”, “Direction” and “States” appear before their fuller FAQ explanations.

**Impact:** New visitors must retain unfamiliar terms while reading the value proposition.

**Change:** Keep the names, with small definitions: “Core, your included editing and reporting tools”; “Directions, your notes and references”; “States, scheduled content changes”. Prefer useful inline explanation over glossary hunting.

**Acceptance:** A five-second comprehension exercise produces a correct answer to what Fourthform sells. A longer read produces correct answers to what is included and what Pro adds.

#### UX-010 | Make First, Site and Pro easier to compare
**P2 · C/V/R**

**Evidence:** Site receives the dominant pricing treatment, First is a lower row and Pro is an optional account upgrade. These represent different decisions.

**Impact:** The unusually large difference between A$199 and A$1,500 can make people unsure whether First is a reduced-quality version or whether they qualify.

**Change:** Present First and Site as website packages with eligibility, scope and revision limits side by side. Present Core/Pro as post-launch capabilities. Explain First's six-month eligibility beside its CTA.

**Acceptance:** A prospect chooses a package using scope and eligibility, and understands that Pro is optional rather than required to keep the website.

#### UX-011 | Tighten the narrative before adding more content
**P2 · C/V/R**

**Evidence:** The hero, manifesto, outcomes, portfolio introduction and closing section repeat variants of clarity, business individuality and easy updates. Several sections have large vertical spacing.

**Impact:** The page has a polished rhythm but asks for a long scroll before resolving practical buying questions.

**Change:** Give each section one job: offer, design evidence, working process, hands-on product, scope, trust and decision. Remove repeated sentences and move the most consequential answers closer to their relevant decision.

**Acceptance:** In a quick scan, each section contributes new information. On a phone, the visitor reaches price and scope without repeatedly encountering the same promise.

#### UX-012 | Keep essential pricing readable throughout motion
**P2 · C/V/T**

**Evidence:** The pricing row uses a clip-path entrance. The pricing evidence captures part of the row while it is still clipped.

**Impact:** A legitimate entrance animation can temporarily hide scope and a purchase action, especially after anchor navigation or during keyboard traversal.

**Change:** Animate a rule or background emphasis rather than clipping the entire price/scope/CTA. Alternatively, complete the reveal immediately when focus enters or an anchor jump lands there.

**Acceptance:** At normal and reduced motion, with keyboard navigation, anchor jumps and a restored scroll position, the price and focused action are fully visible. This screenshot is evidence of an intermediate state, not proof of a permanently broken animation.

### Portfolio and individual concepts

#### UX-013 | Let buyers find relevant work by business type
**P2 · C/R**

**Evidence:** Collection filters classify design approaches; project records also contain sectors.

**Impact:** A restaurant, consultant or retailer may care first about finding a relevant business example rather than selecting an aesthetic category.

**Change:** Add an optional sector filter or brief sector cues. Keep the existing visual-language filters for inspiration.

**Acceptance:** A buyer can find a relevant example without opening numerous unrelated concepts.

#### UX-014 | Explain why a design choice helps the business
**P2 · C/R**

**Evidence:** Dialogs list design techniques and visual descriptions.

**Impact:** The portfolio shows style well, but does not consistently connect it to hierarchy, comprehension or the visitor's next action.

**Change:** Add two or three short notes per featured concept: business goal, design decision and intended visitor action. Describe intent rather than inventing measured conversion results.

**Acceptance:** A non-designer can explain why they might choose a reference, beyond saying that it looks attractive.

#### UX-015 | Increase meaningful variety inside the 20 interactive concepts
**P2 · C/R**

**Evidence:** All concepts share a common page renderer with a hero, an approach, three offer cards and an enquiry. Their copy is logical, but the interaction structure is highly similar.

**Impact:** Distinct hero artwork suggests more range than the underlying navigation and content treatment demonstrate.

**Change:** Deepen selected examples rather than adding more. A restaurant can show menu/hours; a retailer can show a believable product detail; an architect can show a project story; a service business can show a practical enquiry path. Preserve fictional-business disclosure.

**Acceptance:** The strongest examples demonstrate materially different content needs and interactions, while every visible control still has an understandable result.

#### UX-016 | Match concept CTA wording to its actual target
**P2 · C**

**Evidence:** Every concept hero CTA points to `#explore`, including labels such as “Discuss your project”, “Talk about your space” and “Start a conversation”.

**Impact:** Conversation-oriented labels lead to service cards rather than the enquiry interaction.

**Change:** Route conversation actions to contact, or change the label to describe exploration. Carry the selected offer into the enquiry when clicking an offer-specific action.

**Acceptance:** Every CTA's label correctly predicts the next screen or section. An offer enquiry retains its subject.

#### UX-017 | Make browser Back close the portfolio overlay
**P1 · C**

**Evidence:** WorkGallery writes the selected project using `history.replaceState`.

**Impact:** Opening a design does not create a history entry, so Back can leave the collection instead of closing the overlay.

**Change:** Push an entry when opening a design, replace while moving between designs and close according to whether the overlay owns the current entry. Support direct links separately.

**Acceptance:** Open from the collection, navigate between concepts, press Back and return to the same filter and scroll position. A directly linked concept also has a predictable close destination.

#### UX-018 | Preserve collection filters and browsing position
**P2 · C/R**

**Evidence:** The filter is component state; the selected concept is in the query string.

**Impact:** Shared links and return navigation can lose the user's browsing context.

**Change:** Include the filter in the URL and restore scroll/selection consistently. Do not make every arrow click create a long Back stack.

**Acceptance:** Reloading or sharing a filtered collection restores the intended designs. Closing a preview does not jump to the top.

#### UX-019 | Improve the phone portfolio preview layout
**P2 · V/R**

**Evidence:** The phone dialog shows a tall inner website, another information area and a fixed action footer. The useful description is partly below the visible region.

**Impact:** Users switch between the outer dialog's scroll and the inner website's scroll, while the design rationale is easy to miss.

**Change:** Use a full-screen phone sheet with explicit “Website” and “About this design” views, a stable close action and a compact safe-area-aware reference action. Keep a full-page browsing option.

**Acceptance:** At 320 and 390 CSS pixels, users can inspect the design, read the rationale and choose it without confusing which surface scrolls.

#### UX-020 | Be precise about live concepts and keyboard shortcuts
**P2 · C/R**

**Evidence:** Portfolio links say “Open the live website” even though the site is a fictional concept. Arrow-key navigation is handled by the outer dialog; keystrokes within the iframe are not equivalent to events in that outer document.

**Impact:** “Live” can be read as customer work, and the persistent arrow hint can promise an action unavailable while the inner page has focus.

**Change:** Say “Open interactive concept”. Show navigation buttons consistently, and describe the keyboard shortcut only in the context where it works. Preserve the native dialog's focus management.

**Acceptance:** A visitor understands that the business is fictional. Keyboard users can move between concepts and close the dialog regardless of their current focus location.

### Public preview spaces

#### UX-021 | Reduce competing navigation in the embedded demo
**P2 · C/V/R**

**Evidence:** The marketing section offers four space cards, a second row of feature buttons and the focused iframe's own workspace navigation. The space script does filter the inner views, so it is not an unrestricted full navigation list.

**Impact:** The same choice is repeated across several layers before the user can perform a task.

**Change:** Keep the four space choices. Within each embed, show the current task and the minimum working controls. Offer “Open this space” and “Complete workspace” for deeper navigation.

**Acceptance:** A first-time visitor can immediately find a field or interaction to try. The embed has one clear task-navigation layer.

#### UX-022 | Fix overlapping phone demo header and review actions
**P1 · V**

**Evidence:** `mobile-review.png` at the narrow phone width shows the Fourthform wordmark overlapping the project/header text. Save/Submit actions intrude into the review-mode/page controls.

**Impact:** The most important preview looks broken at a common phone size, despite its automated flow checks passing.

**Change:** Define a compact phone header with bounded project-name truncation, a separate action row and enough space for page/mode controls. Eliminate duplicate or competing brand/header elements.

**Acceptance:** At 320, 360 and 390 CSS pixels, no words or controls overlap. Each action has a distinct tap region, including with long project names and larger text.

#### UX-023 | Make the demo's no-account path the primary entry
**P1 · C/V/R**

**Evidence:** Preview onboarding presents Google, email, password, Remember me and “Create account”. “Use the Mori House example” is lower in the form and below the first screen in the phone evidence.

**Impact:** Someone trying a product is invited to enter credentials even though no account will be created.

**Change:** Make “Try the example project” the primary action. Keep signup simulation as a secondary “Preview account setup” task with sample values. Do not ask visitors to reuse a real password.

**Acceptance:** A visitor reaches a meaningful portal task without personal details. The account simulation remains available for anyone who wants to examine it.

#### UX-024 | Make the transition to the complete workspace explicit
**P2 · C**

**Evidence:** Independent spaces use namespaced local storage. “Explore the complete workspace” drops the space parameter and uses a separate set of draft keys.

**Impact:** A user who has just made an edit may expect to see it in the complete workspace, then believe it was lost.

**Change:** Either carry the active example into the complete workspace or state “Open a separate complete example”. Add a return path to the original space and preserve its draft.

**Acceptance:** A user changes a headline, opens the complete example and can predict where that edit will appear. Returning to the focused space restores it.

#### UX-025 | Preserve the package chosen in preview onboarding
**P1 · C**

**Evidence:** First preview onboarding eventually opens the Mori House Site example, with Site's page/revision/payment context. A footnote acknowledges this.

**Impact:** An A$199/one-round selection leads into a three-round/A$1,500 workspace, weakening comprehension precisely when the buyer is evaluating the package.

**Change:** Seed a First-specific example or carry package scope into the preview model. If that is deferred, clearly offer a separately named Site example rather than “Open Initial Direction” as if it were the selected package.

**Acceptance:** First remains one page and one revision round throughout its demo journey. Site retains its own amounts and limits.

#### UX-026 | Give unguided exploration a visible result
**P2 · R**

**Evidence:** Spaces invite exploration and preserve drafts, but the benefit can remain implicit when someone makes one small edit.

**Impact:** A person can test a control without appreciating the outcome.

**Change:** Offer optional task suggestions such as “Change the welcome headline”, “Leave a note on an image” and “Compare a week of traffic”. After an action, show its result and a quiet next suggestion. Do not impose a mandatory tour.

**Acceptance:** Each space lets a new visitor discover and complete a meaningful task within about a minute, with a visible result and freedom to explore further.

### Account, onboarding and project selection

#### UX-027 | Fix the Google sign-in request shape
**P1 · C**

**Evidence:** Onboarding's `auth(true)` always sends `email` and `password`, initially empty strings. The API schema treats these as optional, but validates supplied values as an email and a minimum-eight-character password before reaching the Google branch.

**Impact:** Clicking Google with untouched email/password fields is rejected before the provider can open. The visitor receives a generic validation error.

**Change:** Omit password/email for OAuth, or use mode-specific request validation. Only expose Google when the provider is ready.

**Acceptance:** With a configured staging provider, clicking Google on untouched fields starts OAuth. Email/password signup and sign-in remain independently validated.

#### UX-028 | Make client sign-in and recovery return to sign-in mode
**P1 · C**

**Evidence:** Onboarding defaults to signup mode. The recovery page's “Sign in” link leads to `/start`, which defaults to account creation for a signed-out user. The public portal also ultimately reaches this entry.

**Impact:** Existing clients repeatedly land on an account-creation screen.

**Change:** Provide a stable sign-in route or explicit mode parameter. Keep “Start a new website” as the separate account creation entry.

**Acceptance:** Client sign-in, an expired session and password recovery all return to a sign-in screen while preserving the intended project destination.

#### UX-029 | Make email confirmation a complete state
**P2 · C/R**

**Evidence:** Account creation displays a check-your-email notice, while the underlying signup form remains available.

**Impact:** Users can repeatedly submit or be unsure whether the account exists, especially if delivery is slow.

**Change:** Show the destination address, a change-address action, appropriate resend guidance and an explicit return to sign-in. Explain the same-browser requirement in practical language.

**Acceptance:** A user who receives no message knows what to do next. Returning from confirmation continues the selected brief/reference/package.

#### UX-030 | Use field-level validation in connected onboarding
**P2 · C/R**

**Evidence:** Connected business inputs use a fieldset with button-triggered saving. First's date has a required attribute but is not submitted by a native form; validation is handled by the server. Most errors appear as a general message.

**Impact:** A visitor does not consistently know which answer needs attention.

**Change:** Validate required business/package/date fields at the point of entry. Associate messages with inputs and focus the first invalid field. Keep server validation authoritative.

**Acceptance:** Blank or ineligible inputs produce a specific, readable message at the relevant field without losing other answers.

#### UX-031 | Correct the First payment scope caption
**P1 · C**

**Evidence:** The payment summary always says **“Site · up to 5 custom pages”**, even when the selected package is First and the amount is A$199.

**Impact:** The commitment summary contradicts the chosen scope.

**Change:** Render the package name, page count, revision count, today amount and later amount from one package definition.

**Acceptance:** First shows “First · one page”, A$199 today, no later build balance and one round. Site shows up to five pages, A$200 today, A$1,300 later and three rounds.

#### UX-032 | Route unfinished project cards to their own brief
**P1 · C**

**Evidence:** Every onboarding/payment-phase project card links to `/start`. That route queries the latest project rather than a project identifier from the card.

**Impact:** Clicking an older unfinished project can open another business's brief under the same account.

**Change:** Include the intended project ID and enforce ownership. Make “Start another website” explicitly create or choose a new draft rather than relying on the latest unfinished project.

**Acceptance:** With two unfinished projects, each card opens its own business details and package. Creating another project never silently resumes the wrong one.

### Portal navigation and status

#### UX-033 | Compress phone navigation without hiding the next task
**P1 · C/V/R**

**Evidence:** The connected phone screenshots show eleven navigation items wrapping across three rows. Header plus navigation occupy roughly 220 pixels of an 844-pixel viewport.

**Impact:** About a quarter of the first screen is navigation before any work begins.

**Change:** Use a compact project switcher, three or four frequent destinations and a labelled More menu. Keep the phase's next action prominent. Group remaining destinations by Website, Project and Account.

**Acceptance:** On a phone, users see useful content and its primary action on the first screen. All destinations remain reachable without a dense wall of links.

#### UX-034 | Make the overview an actual next-action dashboard
**P1 · C/R**

**Evidence:** Overview has phase-specific text, but the live state primarily links to billing and the website. The build state is a simple stage list.

**Impact:** Clients must browse sections to discover outstanding work, recent changes or new enquiries.

**Change:** Add one dominant next step, who owns it, last meaningful update and a small activity summary. After launch, prioritize content drafts, enquiries and website health over billing.

**Acceptance:** In every phase, a client can answer “What do I need to do now?” and “What is Fourthform doing?” from Overview.

#### UX-035 | Represent actual phase progress and preserve history
**P2 · C**

**Evidence:** The four-stage sidebar is static, with no current/completed distinction. Phase-dependent navigation removes Direction and Review after launch, with history placed inside nested Overview details.

**Impact:** The timeline looks informative but does not describe current state; previously visible work becomes difficult to find.

**Change:** Bind the timeline to actual phase state. Keep completed project documents accessible through an explicit Project history destination. Add a helpful redirect when an old section link becomes unavailable.

**Acceptance:** Current, completed and forthcoming stages are distinguishable without colour alone. A bookmarked revision remains accessible or redirects to its preserved record.

#### UX-036 | Label navigation state and destination scope correctly
**P1 · C**

**Evidence:** Connected navigation uses an active CSS class but does not apply `aria-current="page"`. It lacks a descriptive navigation label. The project index's “Account settings” links only to password change.

**Impact:** Assistive technology does not receive the same current-page context, and visible labels overstate their destinations.

**Change:** Add navigation naming/current-page semantics. Rename the password link or provide an actual account settings destination.

**Acceptance:** A screen reader identifies the workspace navigation and current section. Every settings link describes the screen it opens.

#### UX-037 | Stop service errors from looking like new onboarding
**P1 · C**

**Evidence:** The project index ignores the projects-query error and redirects to Start when data is absent. ProjectPage catches every `ownedProject` failure and redirects to Start, including missing/access-denied or database failures.

**Impact:** A saved project can appear to have disappeared. A signed-in user can also be bounced between onboarding and an unavailable project.

**Change:** Distinguish signed out, no projects, access denied, missing project and service unavailable. Preserve retry and a return to the user's project list.

**Acceptance:** Simulate each state independently. A transient database failure never displays an empty-account/new-project experience.

### Direction and review

#### UX-038 | Offer undo for destructive board edits
**P1 · C**

**Evidence:** Direction object deletion, review Direction deletion and State removal immediately mutate autosaved data. Stroke undo exists, but item-level undo does not.

**Impact:** One mistaken tap can become a persisted deletion.

**Change:** Add a short-lived Undo action for ordinary removals and a deliberate confirmation for unusually consequential bulk changes. Preserve keyboard focus after removal.

**Acceptance:** Delete a note, attachment or schedule and restore it without recreating it. Undo works before and after autosave confirmation.

#### UX-039 | Turn recording into a clear, bounded workflow
**P2 · C/R**

**Evidence:** Recording controls are tucked inside a “+” details menu. They rely on browser permission APIs and produce a generic failure message. Recording has no visible elapsed-time or discard workflow.

**Impact:** Users may not understand what is being recorded, whether it is active or how to stop/discard it.

**Change:** Use a labelled Add menu. Show capability availability, recording type, duration and explicit Stop/Discard controls. State file limits before an upload and preserve retry information.

**Acceptance:** Permission denial, unsupported screen recording, a stopped device and a large file each produce a specific recovery path. Phone users can upload a recording if browser capture is unavailable.

#### UX-040 | Replace prompts and honour Cancel
**P2 · C**

**Evidence:** Links, timestamp notes, drawing text, group names and agency review URLs use browser prompts. Grouping uses `prompt(...) || "Group"`, so cancelling still groups the selected objects.

**Impact:** Native prompts lack project context and inconsistent cancellation can change work unexpectedly.

**Change:** Use compact in-product forms with labels and validation. Treat Cancel as no change. Supply meaningful default values only after explicit confirmation.

**Acceptance:** Cancelling any add/group/annotation action leaves the document unchanged. Errors appear beside the relevant input.

#### UX-041 | Make recovery and conflict choices understandable
**P2 · C/R**

**Evidence:** The board recovery interface offers local, server and merge choices, with a count of overlapping changes and exports. It does not show a readable difference between versions.

**Impact:** The technical safety is stronger than the client's ability to choose confidently.

**Change:** Show version time, changed objects and a concise comparison. Prefer “Keep my edits”, “Use the latest saved version” and “Combine separate edits”, with consequences explained.

**Acceptance:** A non-technical client can resolve a two-tab conflict and identify what will be retained. Locked submissions remain immutable.

#### UX-042 | Give expired sessions an immediate save-recovery path
**P1 · C/R**

**Evidence:** `useSave` correctly retains board drafts and says the session ended, but the save error does not provide a direct sign-in-and-return action.

**Impact:** A client has to infer how to regain access without losing the editor context.

**Change:** Offer “Sign in to save” with a safe return path and retain the recovery draft. Explain whether an export is useful while account access is unavailable.

**Acceptance:** Expire a session during editing, sign in and return to the same board with the draft intact.

#### UX-043 | Default phone review to a readable phone viewport
**P1 · C/V**

**Evidence:** ReviewCanvas starts at 1024 pixels and scales to available width. The narrow demo screenshot shows a tiny desktop website centred in a large empty canvas. The connected canvas uses the same desktop-width default.

**Impact:** The user cannot comfortably read text or precisely select an element on a phone.

**Change:** Choose a phone viewport on phone entry, fit the site to usable width and provide clear Phone/Tablet/Desktop presets. Use a comment sheet rather than requiring a large blank desktop workspace.

**Acceptance:** At 320 and 390 CSS pixels, website text is readable without pinch zoom and an element can be selected accurately. A deliberate desktop-preview choice remains available.

#### UX-044 | Anchor drawing feedback to the current page
**P1 · C**

**Evidence:** “Draw a Direction” creates a target with `page: "/"`, width 1024 and scroll zero. The drawing editor is an empty annotation surface in the inspector.

**Impact:** Drawing feedback can be labelled as Home regardless of the current page and lacks the visual context that would make it precise.

**Change:** Capture the current page, viewport and scroll context. Draw over a frozen preview or image, with an accompanying text description. Preserve original context when the website changes.

**Acceptance:** Draw on another page at a particular scroll position, save/reopen and recover that same context. A text-only alternative can communicate the request.

#### UX-045 | Replace hold-only revision confirmation with standard activation
**P1 · C**

**Evidence:** Submission uses three stages, an acknowledgement checkbox and a 0.9-second hold. Keyboard hold exists, but the final button has pointer/key hold handlers and no ordinary click activation.

**Impact:** The interaction creates unnecessary friction and can fail activation methods that synthesize a click, such as some assistive or voice controls.

**Change:** Use a concise batch summary, explicit revision cost and a conventional “Submit round 2 of 3” button. Retain withdrawal before work begins. A hold effect can be optional, not the sole route.

**Acceptance:** Mouse, touch, keyboard and screen-reader activation complete the same transaction. The client understands the consumed round before submitting.

#### UX-046 | Keep selection and feedback context together
**P2 · C/R**

**Evidence:** Adding a Direction selects it in state; the text editor sits farther down the inspector. Selection shows an element label or selector, while batch/history lists reduce notes to text/name/type.

**Impact:** Users can lose the relationship between a selected element, their note and the batch being submitted.

**Change:** Focus the new text field, reveal it into view, show page/element context and include attachment thumbnails in the batch summary. Keep mobile keyboard positioning predictable.

**Acceptance:** Add a note, edit it, revisit it and review the batch without asking which element it concerns.

#### UX-047 | Make moved targets repairable and round counts explanatory
**P2 · C/R**

**Evidence:** The review bridge reports moved/disappeared targets, preserving notes in a list. The submit area displays a revision numerator/limit, but not a clear included-rounds-remaining explanation or direct repair action.

**Impact:** A preserved note can become unhelpful without its anchor, while a counter can be mistaken for notes rather than revision batches.

**Change:** Add “Reattach to an element” and retain the original page label. State “2 of 3 rounds remaining. Saving notes uses no round.” Show prior batch status and expected next step without raw internal status labels.

**Acceptance:** A moved element does not destroy feedback; the user can reattach it. A first-time client correctly explains how many rounds remain.

#### UX-048 | Distinguish approval from launch
**P1 · C**

**Evidence:** The approval dialog is titled “Ready to launch?” even though approving ends the build phase and may lead to an A$1,300 balance and later launch checks.

**Impact:** A consequential action is described as a different lifecycle transition.

**Change:** Title it “Approve this website?” Summarize the approved version, remaining amount, what changes afterwards and the separate launch step. Make approval discoverable from Review as well as Overview.

**Acceptance:** A client understands that approval does not itself publish the website, and can identify the exact version being approved.

### Pages, Search and publishing

#### UX-049 | Extend recovery to content and settings editors
**P1 · C**

**Evidence:** Direction boards have autosave and device recovery. SiteContentEditor and SettingsWorkspace keep unsaved changes in component state and use a leave guard, without equivalent local recovery. The shared API connection error says “Your draft is retained” regardless of the calling editor.

**Impact:** After a reload, crash or interrupted session, the reassuring error can be false for these editors.

**Change:** Preserve recoverable local drafts for Pages, Search and Settings, or use precise operation-specific language that does not promise persistence. Keep a clear distinction between device recovery and a server-confirmed save.

**Acceptance:** Edit each workspace, lose the connection and reload. Recover the draft, or see an accurate prior warning. No generic error claims preservation that the feature does not provide.

#### UX-050 | Handle a successful mutation followed by a failed reload
**P1 · C**

**Evidence:** SiteContentEditor saves through the API, then reloads content before clearing dirty state. If the mutation succeeds and the read fails, it presents an error while retaining the old revision. Reload is only offered when there is no existing data. Conflict handling is not equivalent to the board editor.

**Impact:** A saved change can look unsaved, and retry can conflict with the already-advanced revision without a clear recovery action.

**Change:** Treat the mutation receipt and subsequent refresh separately. Reconcile the authoritative result, preserve the local snapshot and offer explicit reload/compare/retry actions.

**Acceptance:** Simulate response loss and a failed post-save read. The client is never told a known successful save failed, and can reconcile an uncertain result without discarding edits.

#### UX-051 | Tell users which version they are previewing
**P2 · C/R**

**Evidence:** “Preview saved draft” opens a separate review page. Unsaved input is not what appears there. There is no inline preview beside connected content fields comparable to the public demo.

**Impact:** A client may change a heading and think the preview is stale or broken.

**Change:** Display “Unsaved edits”, “Saved draft” and “Published” explicitly. Offer Save and preview, or a local preview of the working draft. Show page/address and last saved time.

**Acceptance:** Users can identify whether a change is only in the editor, saved to the account or visible to visitors.

#### UX-052 | Review changes before publishing or restoring
**P1 · C/R**

**Evidence:** Publishing and rollback use browser confirmations. Published history lists timestamps and identical Restore buttons, with no change summary or preview.

**Impact:** A client must commit without easily verifying the affected pages and fields.

**Change:** Use a publish summary with changed fields/pages, destination and current versus proposed values. Give history entries a version label, author/source, change summary and preview. Restore should create a new version, as the backend already does.

**Acceptance:** A client identifies the correct version and the exact changes before confirmation. A multi-page update does not accidentally obscure which pages will change.

#### UX-053 | Make content-field constraints useful while editing
**P2 · C/R**

**Evidence:** Inputs apply maxLength but most do not show remaining length or practical guidance. Link fields are plain text. Image uploads show a small thumbnail without contextual crop information.

**Impact:** People can hit limits without understanding them or publish an unsuitable link/image.

**Change:** Show relevant limits, examples and field-specific validation. Clarify URL, email, telephone and internal-link destinations. Where the design crops images, show the crop and allow a focal point. Keep descriptive image text adjacent to the image.

**Acceptance:** Common content mistakes are explained before publication, and a client can predict how the uploaded image will appear.

#### UX-054 | Make hiding a page from search a deliberate decision
**P1 · C/R**

**Evidence:** Search editing offers “Keep this page out of search results” as a standard checkbox.

**Impact:** A non-technical owner can unintentionally request removal of an important page from search.

**Change:** Explain what the setting does, distinguish it from making a page private, and show a clear warning in the publish summary when it changes. Do not imply that search-engine changes are immediate or guaranteed.

**Acceptance:** A client understands that noindex does not password-protect a page and sees the change explicitly before publishing.

#### UX-055 | Restore the search-preview clarity in the connected app
**P2 · C/R**

**Evidence:** The public demo offers a search-result preview; the connected editor has character counts and published-page inspection. The inspection API returns URL and checkedAt, but the UI does not display them.

**Impact:** Users have less context in the real workflow and can confuse an edited draft with an inspected published page.

**Change:** Add a clearly illustrative search snippet and show the inspected URL, version/context and check time. Map inspection status to plain language. Keep the existing caveat that search engines determine indexing and placement.

**Acceptance:** A user can distinguish preview wording, saved metadata and an actual check of the published URL. No score or result promises search ranking.

### States and scheduling

#### UX-056 | Separate saving a State from activating it
**P1 · C**

**Evidence:** StateEditor uses the board autosave hook. New schedules are enabled by default. The public renderer reads the saved States board directly and evaluates it for Pro websites.

**Impact:** A client can change live scheduled content simply by pausing during editing, unlike Pages' separate publishing flow.

**Change:** Introduce a draft/active distinction and deliberate activation or clearly label “Changes affect your live website as soon as saved”. Prefer explicit activation for newly created schedules. Show current active state and the next transition.

**Acceptance:** Starting an unfinished schedule cannot alter the public website. Editing and activation consequences are consistent with the product's broader save/publish model.

#### UX-057 | Do not autosave an invalid schedule as a failed command
**P1 · C**

**Evidence:** SaveControl is disabled when a State is invalid, but useSave still autosaves after three seconds. The API and database correctly reject invalid schedule values.

**Impact:** Ordinary intermediate editing, such as clearing a title or changing weekdays, can cause a server save error even when the manual Save button is disabled.

**Change:** Retain invalid working drafts locally, show field-level validation and send only valid schedule updates. Keep all server and database validation.

**Acceptance:** Temporarily clear a title/time/day while editing. The UI explains the problem without making an invalid save request or falsely reporting a saved schedule.

#### UX-058 | Preview schedules in the user's working timezone
**P2 · C**

**Evidence:** The preview uses “Preview instant (UTC)” while schedules use named local timezones. New schedules default to Australia/Brisbane rather than reading the chosen business timezone.

**Impact:** Owners outside that timezone must convert times to understand what visitors see.

**Change:** Use a searchable timezone picker and a local date/time preview tied to the schedule or business timezone. UTC can remain an advanced option. Show an understandable sentence such as “Mon to Fri, 5 pm to 10 pm, Brisbane time”.

**Acceptance:** A user in another timezone previews the intended local service time, including an overnight interval and daylight-saving boundary, without manual conversion.

#### UX-059 | Make schedule lists and conflicts understandable
**P2 · C/V/R**

**Evidence:** Connected States lists selectable titles and reports active-schedule counts/conflicting field IDs. The phone demo displays repeated single-letter weekdays, with Saturday wrapping to a separate row. The demo does have full weekday accessible names.

**Impact:** Visual schedule choices and overlap resolution require unnecessary interpretation.

**Change:** Use short visible names such as Mon/Tue, a stable seven-day layout or wrapped labelled groups, schedule summaries and explicit active/paused states. Identify conflicting schedules and content fields by human-readable names. Show an empty-state example when no schedule exists.

**Acceptance:** An owner can identify when each schedule runs, what it changes and which overlap needs attention. Do not misreport the demo's existing accessible weekday labels as absent.

### Launch and domains

#### UX-060 | Show the complete launch URL before confirmation
**P1 · C**

**Evidence:** Launch options reduce the platform URL to its hostname even though the included website address uses a project path. Confirmation refers to “the verified address” without showing it.

**Impact:** A client can approve publication without recognizing the actual public address.

**Change:** Show the full included URL or custom domain, a preview/open/copy action, the site/version being launched and whether search visibility is enabled.

**Acceptance:** The displayed launch destination exactly matches the published destination, including the platform project path.

#### UX-061 | Keep check freshness and version state honest
**P1 · C**

**Evidence:** The interface enables Review launch when there are five check records. The database requires five checks bound to the current revision and newer than 24 hours.

**Impact:** Old evidence can look ready in the UI, only for the server to reject launch. The backend guard is correct; the presentation is incomplete.

**Change:** Show expired, invalidated and current checks separately. Evaluate the same freshness/version rules in the presentation and explain why another check is needed.

**Acceptance:** After a content change or 24-hour expiry, the UI immediately asks for rechecking and does not present the launch as ready.

#### UX-062 | Show launch activity and failures by action
**P2 · C/R**

**Evidence:** Saving, checking and publishing share a busy flag, and the checks are largely shown as checked timestamps or waiting. The final-check button can say “Checking…” during unrelated work.

**Impact:** Clients cannot consistently tell which action is running or which dependency failed.

**Change:** Use action-specific progress and per-check states: not run, checking, passed, needs attention and expired. Attach failures and retries to their affected row. Preserve useful results when one read fails.

**Acceptance:** A failed domain check leaves other known status visible. Save, check and launch each show the correct busy label and cannot be double-submitted.

#### UX-063 | Make DNS instructions safe to copy and relate to a domain
**P1 · C/R**

**Evidence:** The connected domain interface shows TXT tokens and a separate global hosting-record table. It has no per-value copy controls, and the displayed hosting instructions are not strongly headed with the domain that produced them.

**Impact:** A client with more than one hostname can use records for the wrong address or copy a label along with a value.

**Change:** Bind instructions to the selected hostname. Provide separate copy buttons for Type, Name and Value, plus root/subdomain examples and expected verification steps. Show registrar-independent guidance without pretending to control the registrar.

**Acceptance:** Switch between two domains and confirm every record remains associated with the correct hostname. Copy actions copy only the intended values. Failed verification explains what to check.

### Analytics and enquiry management

#### UX-064 | Explain analytics measures and the reporting period
**P2 · C/R**

**Evidence:** Analytics shows “Daily visitors” beside totals for the selected 7/30/90-day period. The introduction describes anonymous daily estimates. The demo shows reservations, while the connected app records action clicks and enquiries.

**Impact:** Owners can read the visitor figure as unique people across the whole period or interpret clicks as confirmed bookings.

**Change:** State period dates and timezone. Label the visitor aggregation accurately, explain action clicks and distinguish enquiries from completed external bookings. Keep privacy limitations concise and honest.

**Acceptance:** A business owner can explain each metric and understands that tracked actions are not necessarily completed purchases/bookings.

#### UX-065 | Provide an accessible, readable chart alternative
**P1 · C**

**Evidence:** The connected daily chart uses a generic image label, narrow bars, vertical 9-pixel date labels and native title tooltips. Daily values are not provided in an equivalent accessible table.

**Impact:** Keyboard, screen-reader and many phone users cannot reliably inspect daily values.

**Change:** Add a textual trend summary and a date/value table or accessible chart inspection controls. Use readable axis ticks and useful empty/low-volume states. Do not rely on hover for values.

**Acceptance:** A keyboard and screen-reader user retrieves the same daily counts as a mouse user. The chart remains useful at phone width and enlarged text.

#### UX-066 | Make report comparison and export useful to owners
**P2 · C/R**

**Evidence:** Connected Pro comparison is a paragraph of numbers; report export is JSON. The demo offers CSV. Range buttons depend on the currently loaded data, so the 90-day Pro choice disappears while a new report is loading.

**Impact:** Comparison takes mental arithmetic, export is difficult for ordinary reporting and controls shift during loading.

**Change:** Show concise current/previous comparisons with counts, direction and an appropriate explanation for low baselines. Provide CSV alongside JSON. Preserve entitlement/range controls during loading.

**Acceptance:** An owner can identify what changed and open an export in a spreadsheet. Selecting 90 days does not make that control vanish during the request.

#### UX-067 | Give the Inbox usable filters and retrieval
**P2 · C/R**

**Evidence:** Inbox renders message cards with read/archive status and a load-older action, without explicit new/read/archived filters or search.

**Impact:** Once enquiries accumulate, it becomes difficult to find an older lead or know where an archived message went.

**Change:** Add New/All/Archived views, a new count, search and a compact list/detail arrangement at larger widths. Keep the working email-reply action visible.

**Acceptance:** A client can find, archive, restore and reply to a particular enquiry in a sizeable sample inbox.

#### UX-068 | Keep Inbox feedback local and truthful
**P2 · C/R**

**Evidence:** A global busy flag disables message actions across the inbox. A successful status change updates the card but does not explicitly clear an earlier action error or announce the new state.

**Impact:** One operation makes the whole inbox feel blocked; stale failure text can survive a successful retry.

**Change:** Use row-level pending states and a short result announcement. Clear resolved errors. Preserve an overall refresh state separately.

**Acceptance:** Updating one message does not freeze unrelated messages unnecessarily. After retry succeeds, no outdated failure remains.

### Payments, subscriptions and account preferences

#### UX-069 | Handle payment return, pending and cancelled states
**P1 · C**

**Evidence:** Checkout returns to Overview with `payment=processing` or `payment=cancelled`. ProjectPage/Overview does not consume these return states. A delayed authoritative confirmation can leave the earlier payment-required view visible.

**Impact:** A paying customer can wonder whether payment worked and try again.

**Change:** Show “Payment submitted. We are checking confirmation”, reconcile with authoritative server state and handle a bounded waiting period with refresh/help. Show cancellation as cancellation. Never mark a payment paid from a URL parameter.

**Acceptance:** Exercise delayed confirmation, a cancelled checkout, a failed payment, a refreshed callback and a duplicate callback in staging. No state implies the customer should pay again while confirmation is pending.

#### UX-070 | Add clear checkout and subscription busy states
**P1 · C**

**Evidence:** ProjectWorkspace's `pay()` has no busy lock or progress state. Manage subscription opens an API request without its own pending indicator. The backend reservation deduplicates checkout creation, which should remain.

**Impact:** Repeated clicking feels necessary when nothing visible happens, even though the server protects the transaction.

**Change:** Disable only the active payment action, show “Opening secure checkout…” or “Opening billing…”, clear prior errors and preserve the current project context on return.

**Acceptance:** A slow response gives immediate feedback. Repeated activation does not create confusing navigations, and failed opening offers an obvious retry.

#### UX-071 | Use client-friendly billing records and renewal information
**P2 · C/R**

**Evidence:** Billing's introductory text refers to signed provider events. Payment history displays raw payment kinds. Subscription information primarily shows a status string and a provider-management button.

**Impact:** Technical wording and internal payment labels add effort; the ongoing commitment remains hard to inspect.

**Change:** Say “Payments appear here once confirmed”. Map kinds to “Website deposit”, “Remaining balance” and “Additional revision round”. Show next charge, renewal/cancellation effective date and what happens to Pro features where provider data supports it. Offer a real receipt/invoice destination.

**Acceptance:** A client can explain what each payment covered, what is due next and what cancelling Pro changes. Core remains clearly included.

#### UX-072 | Make settings failures recoverable
**P1 · C**

**Evidence:** Settings shows loading until an error occurs. With no settings loaded, an error leaves no load/retry action. Domains similarly offers weak initial-load feedback and recovery.

**Impact:** A transient read failure can produce a dead-end screen.

**Change:** Use consistent loading, failed-load and retry states, separate from save failures. Retain previously loaded values when refreshing.

**Acceptance:** Fail the initial read, then retry successfully without reloading the entire application or re-entering a URL.

#### UX-073 | Avoid stale Saved notices and clarify preference scope
**P2 · C**

**Evidence:** Settings save sets “Saved to your account”. Several settings change handlers set dirty without clearing that notice. The workspace is labelled Account/Settings even though its values are project-specific, including business timezone and project notifications.

**Impact:** A visible Saved notice can contradict new unsaved edits, and clients may assume one project's preference applies account-wide.

**Change:** Clear success messages when inputs change. Label project preferences separately from account credentials. Use a timezone picker and show notification delivery state in practical terms.

**Acceptance:** Editing after a successful save immediately changes the status to unsaved. Multi-project users understand which settings apply to which business.

### Customer website and agency handoff

#### UX-074 | Explain review-form limitations before someone types
**P2 · C**

**Evidence:** The private customer review page displays the contact form normally; only after submit does it say the form becomes available at launch.

**Impact:** A reviewer enters a complete enquiry before learning the submission cannot be tested there.

**Change:** Show the review-mode limitation beside the form before input, or provide a clearly labelled test response that cannot deliver a real enquiry.

**Acceptance:** A reviewer can predict whether the form sends a message before filling it in. Public success/error states remain distinct and preserve entered text after failure.

#### UX-075 | Tie image descriptions to the actual content
**P2 · C/R**

**Evidence:** The main customer image supports an editable description. Additional role-free images use the schema field label as alt text. Concept artwork uses the generic phrase “visual direction”.

**Impact:** A field label may not describe an image's purpose; missing or generic descriptions reduce comprehension for people who do not see the image.

**Change:** Support meaningful descriptions or an explicit decorative choice per image. Add guidance and a check alongside upload, rather than requiring owners to discover it in a later search inspection.

**Acceptance:** Review informative and decorative images with a screen reader. Descriptions communicate relevant content and decorative images do not add redundant noise.

#### UX-076 | Verify that the real delivered design preserves the chosen reference
**P2 · C/T/R**

**Evidence:** The connected customer renderer supports a limited set of layouts and editable fields. The 20 studio concepts demonstrate broader art direction, while the connected test customer uses a generic page structure.

**Impact:** A technically working CMS does not by itself establish fidelity to a client's selected visual reference or business-specific content needs.

**Change:** For representative projects, compare the approved design, actual published page and editable content model. Ensure menus, services, hours, location, products or project stories can be represented as promised. Avoid exposing schema field names as finished website headings.

**Acceptance:** The published website preserves the approved hierarchy and visual identity; normal owner updates cannot inadvertently break that design. This is a delivery validation requirement, not a claim that every custom project is currently defective.

#### UX-077 | Replace raw agency JSON with a reviewable setup interface
**P2 · C/R**

**Evidence:** Agency website setup is a large JSON textarea for the site definition.

**Impact:** Routine setup and small corrections require editing technical structure, and validation errors are difficult to connect to the visible page.

**Change:** Provide page/field/theme controls with a preview, validation summary and safe advanced JSON mode. Clarify when setup changes reset or replace customer content.

**Acceptance:** An operator creates a typical project without writing JSON, verifies the preview and makes a small field change without accidentally replacing unrelated content.

#### UX-078 | Make team actions clear, deliberate and traceable
**P2 · C/R**

**Evidence:** Team actions appear within Overview details. Several actions have no dedicated disabled/busy state or version summary; delivering a review site uses a prompt.

**Impact:** It is easy to lose track of which project/version an agency action affects.

**Change:** Add a dedicated agency work queue and contextual action summaries: client, project, current state, target version, validation and result. Make pending actions non-repeatable in the UI.

**Acceptance:** An operator managing several projects can safely begin work, deliver a review and complete a revision without confusing projects or interpreting internal statuses.

### Shared UI, accessibility and finishing quality

#### UX-079 | Correct the identified text-contrast combinations
**P1 · C**

**Evidence:** The connected active navigation uses `#665cf6` on `#eeecff`, approximately **4.08:1** for 14-pixel text. The shared muted token `#85837b` on `#f3f1eb` is about **3.36:1**; the connected empty-message style uses that muted colour. On `#faf9f5` it is about **3.60:1**.

**Impact:** These specific normal-text combinations fall below the usual WCAG AA 4.5:1 threshold. This is not a statement that every grey or purple element fails.

**Change:** Darken text tokens where used for meaningful normal-sized text. Keep decorative rules and inactive controls separate. Use semantic current/selected indicators alongside colour.

**Acceptance:** Measure actual rendered foreground/background combinations in every state. Retest active navigation, empty messages, disabled exceptions and text over imagery. The calculation does not constitute an entire-site accessibility certification.

#### UX-080 | Complete a device and assistive-technology acceptance pass
**P2 · T**

**Evidence:** The CI flows establish many functional paths, but phone screenshots still reveal overlap and cramped review controls. Screen-reader behaviour, large text, virtual keyboards and intermediate widths are not established by these screenshots.

**Change:** Test keyboard-only navigation, screen readers, zoom/reflow, touch targets, safe areas, landscape and on-screen keyboards on staging. Include long project names, long URLs, translated/expanded labels and sparse/large data.

**Acceptance:** Users can complete onboarding, one revision, content publication, an enquiry and account recovery without clipped controls, hidden focus or a pointer-only action. Record actual pass/fail evidence rather than inferring it from builds.

#### UX-081 | Consolidate design rules and validate desktop motion/performance
**P2 · C/T/R**

**Evidence:** The projects share a motif and base tokens but retain substantial overlapping style layers and separate demo/connected implementations. Desktop uses GSAP/Lenis, sticky sections and multiple iframes. Reduced-motion and preference-change handling already exist.

**Impact:** Small fixes can diverge between the brochure, preview and working portal, and a screenshot does not establish animation smoothness or loading quality.

**Change:** Define shared typography, spacing, controls, status colours, motion duration and focus treatments. Reserve the four-corner motif for meaningful frames/selection. Prefer opacity/transform for decoration; keep essential content available. Measure staging performance with cold/warm loads rather than adding more motion by assumption.

**Acceptance:** Verify ordinary wheel, trackpad, keyboard scroll, anchor jumps, direct section loading, Back/Forward restoration and preference changes on desktop. Run actual mobile/desktop performance measurements; do not claim a score until measured.

## Demo-to-connected parity table

| Task | Current preview | Current connected experience | Required alignment |
| --- | --- | --- | --- |
| Account setup | Simulated Google and password inputs | Real API/session with provider configuration | Default demo to example data; repair Google request shape; make sign-in a separate entry |
| First package | First pricing, then Mori House Site workspace | First exists, but payment caption says up to five pages | Carry one-page/one-round scope throughout |
| Review | Rich canvas, resize dials, mode choices | Real iframe/element bridge, inspector and width presets | Share vocabulary; make both phone-readable; document actual supported gestures |
| Save a Direction | Local browser save | Autosave, receipt verification, device recovery | Use distinct “Saved on this device” versus “Saved to your account” |
| Edit Pages | Illustrated mini preview and local apply | Field editor, saved-draft preview, separate publication | Show the draft/live distinction in both; restore contextual preview |
| Search | Snippet, ready sharing/structured-data indicators | Metadata editor and real published HTML inspection | Only show ready checks when true; carry snippet/URL/time into connected UI |
| Analytics | Sample reservations, visual trends and CSV | Page views, daily visitor estimates, clicks, enquiries; JSON export | Avoid suggesting confirmed booking analytics; offer comparable reporting/export |
| Connections | Reservation/form/social cards and consent control | Booking/social URL fields; Inbox collection | Distinguish a link from a provider integration; demonstrate actual privacy behaviour |
| States | Usual/scheduled comparison, Save schedule | Local-time rules, UTC preview, autosaved live board | Consistent deliberate activation and readable local-time preview |
| Domains | Illustrative records, www redirect status, copy action | Ownership verification and hosting records | Demonstrate the real verification stages; only promise redirect/certificate behaviour actually supported |
| Billing | Example card details and local subscription actions | Provider checkout/management and confirmed records | Match payment terminology; label sample data and show real pending/renewal states |
| Launch | Simulated five-step account/site checklist | Version-bound, time-limited integration checks | Explain actual prerequisites and display the verified full destination |
| Inbox | Test enquiry shown through a dialog | Persistent read/archive cards | Showcase actual persistent enquiry management as its own task |
| Settings | Local export/reset and demonstration preferences | Project preferences, credentials link | Separate demo storage settings, project preferences and account credentials |

## Recommended portal navigation

This is a proposed information structure, not an instruction to remove existing functionality.

| Location | Primary destinations | Supporting destinations |
| --- | --- | --- |
| Desktop during a build | Overview, Direction, Review when delivered | Pages, Project history, Billing, Project settings |
| Desktop after launch | Overview, Pages, Inbox, Analytics | Search, States, Domains, Connections, Project history, Billing, Project settings |
| Phone | Current task plus Overview, Pages/Review and Inbox where relevant | Labelled More menu containing all remaining sections |
| Account menu | Your websites, Account/password settings, Sign out | Help/contact and a clearly separate example workspace |

During the build, phase transitions should guide the next step without deleting access to completed records. After launch, everyday work should take priority over the original purchase lifecycle.

## Recommended language and action system

| Meaning | Preferred wording | Consequence that must be explicit |
| --- | --- | --- |
| Browse a public example | Try the example | No account, payment or live change |
| Save on a demo device | Saved on this device | Not synced to an account |
| Save actual work | Save draft / Saved to your account | Not automatically sent or published |
| Share the initial brief | Send Initial Direction | Agency receives it; no revision round used |
| Send a revision batch | Submit round 2 of 3 | One round used; withdraw only before work begins |
| Accept a design | Approve this website | Build phase ends; show remaining payment and next launch step |
| Publish everyday changes | Publish changes | Identified draft becomes visible on the displayed website |
| Activate timed content | Activate schedule | Saved valid content can appear during the stated local interval |
| Inspect search setup | Check published page | Actual URL/time; no ranking guarantee |
| Open payment provider | Open secure checkout | Show amount, purpose and confirmed/pending/cancelled return states |
| Client account entry | Client sign-in | Access existing projects |
| Change credentials | Change password | Avoid the broader “Account settings” label unless a broader screen exists |

Brand expression should stay strongest in headings and artwork. Transactions should use straightforward verbs. “Bring it into form” works as an agency theme, but not as the only explanation of what a payment or publish button does.

## Visual direction to refine, not replace

1. **Keep the motif disciplined.** Use the four corners for website frames, selected references and meaningful focus contexts. Avoid applying it to every divider or using rotation as an unexplained status.
2. **Separate display typography from working typography.** Keep expressive serif headlines on marketing; prioritize readable sans-serif labels, values and transactions in the portal. Do not make important scope information tiny to preserve an airy composition.
3. **Make one action dominant in each context.** A revision screen should privilege the batch task; a live Overview should privilege current work; Billing should privilege the actual outstanding payment.
4. **Use whitespace to establish hierarchy.** The phone review's blank canvas does not help comprehension. Use the space for readable content and accessible interaction.
5. **Make surfaces consistent by meaning.** Draft, submitted, active, locked, error and unavailable should have predictable label, icon and colour treatment.
6. **Design short screens as carefully as large ones.** A 320-pixel phone, landscape browser and open virtual keyboard should receive an intentional layout rather than a scaled desktop canvas.
7. **Let motion communicate a change.** Content switching and selection benefit from restrained transitions. Pricing, submission and error information should remain available during animation.
8. **Make the delivered product look related to its preview.** Similar typography, controls and state language matter more than copying every decorative frame.

No screenshot or heuristic score can establish that the site is “Awwwards-quality”. A credible target is distinctive art direction combined with unusually clear content, reliable interactions, graceful responsive behaviour and measured loading performance.

## Systematic acceptance plan

### Pass 1: Repair the consequential paths

Validate UX-001, 027, 028, 031, 032, 037, 043, 044, 045, 048, 049, 050, 056, 057, 060, 061, 069, 070 and 079. These are publication, purchase, preservation, consequential-action or accessibility concerns. Do not substitute a cosmetic pass for them.

### Pass 2: Test meaningful customer journeys

| Journey | Task | Completion evidence |
| --- | --- | --- |
| New buyer | Understand offer, compare First/Site, select a reference | Correct explanation of scope, price, eligibility and next step |
| Demo visitor | Try three unrelated tasks in any order | Visible result, retained draft, no credential requirement and no misleading live claims |
| Existing client | Sign in to a bookmarked project | Correct project/section restored |
| New client | Save brief, return later, continue payment | Own brief restored, correct package, clear pending/cancelled/confirmed result |
| Reviewer | Leave element and drawing feedback, submit a batch | Right page/viewport, understood round cost, usable standard activation |
| Owner | Change content, save, preview, publish, restore | Correct version at each step and recoverable errors |
| Pro owner | Create an overnight schedule and resolve an overlap | Correct local-time result and deliberate activation |
| Launching owner | Choose address and run checks | Exact destination, fresh evidence and a understandable failure recovery |
| Business operator | Receive, archive, find and reply to an enquiry | Persistent record and discoverable archive/reply behaviour |
| Agency operator | Set up, deliver and revise two projects | No project confusion; visible confirmation and activity history |

### Pass 3: Exercise failure and intermediate states

- Slow network, offline editing and response loss after a successful command.
- Expired login while dirty, account confirmation on another browser, missing email and failed Google access.
- Two unfinished projects and two browser tabs changing the same document.
- Empty, one-item and large lists; long names, URLs and text.
- Upload rejection, scanner unavailable, device capture denied and storage disabled/full.
- Payment cancelled, delayed confirmation, failed payment, duplicate activation and Pro cancellation.
- DNS unverified, incorrect records, changed destination, stale checks and changed content revision.
- Search hidden intentionally/unintentionally, draft metadata differing from published metadata.
- Schedules disabled, overnight, daylight-saving transition, overlapping priority and no available editable fields.

### Pass 4: Verify access and responsive behaviour

- Keyboard-only operation, including entering/leaving iframe content and returning from dialogs.
- VoiceOver/Safari and a Windows screen-reader/browser combination; add TalkBack/Android for phone acceptance.
- 320, 360, 390, 768, 1024 and 1440 CSS-pixel layouts, plus intermediate breakpoints and landscape.
- Enlarged text, 200% zoom and reflow equivalent to 320 CSS pixels where applicable.
- Visible focus under sticky headers/footers, virtual keyboard positioning and safe areas.
- Reduced motion selected before page load and changed while the page is open.
- Wheel, trackpad, Space/Page Down, anchors, direct routes and restored scroll.
- Cold/warm loading and real performance measurements on staging, including third-party and iframe cost.

For usability validation, start with a small set of representative business owners and ask them to perform the tasks without coaching. Record misunderstandings, wrong turns and hesitation, rather than only asking whether they like the visual design. The sample is formative, not statistical proof.

## Source index

The links below pin findings to the audited revisions rather than moving main branches.

### Marketing

- [Homepage, navigation, previews, pricing and motion](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/components/marketing/MarketingHome.tsx)
- [Customer-flow routing](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/lib/customer-flow.ts)
- [Connected start handoff](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/app/start/page.tsx)
- [Portfolio collection](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/components/work/WorkGallery.tsx)
- [Portfolio dialog](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/components/work/ProjectDialog.tsx)
- [Concept renderer](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/components/concepts/ConceptSite.tsx)
- [Copy for all 20 concepts](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/lib/portfolio/concepts.json)
- [Preview onboarding](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/components/preview/OnboardingPreview.tsx)
- [Independent-space storage](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/public/portal-preview/portal-preview-spaces.js)
- [Preview operational features](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/public/portal-preview/portal-operations.js)
- [Marketing styles](https://github.com/mlngaxri/marketingwebsite-/blob/b81e1d4d47259a8465814629666d96b719014a15/app/marketing.css)

### Connected portal

- [Connected onboarding](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/Onboarding.tsx)
- [Authentication request validation](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/api/auth/route.ts)
- [Project index](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/app/page.tsx)
- [Project selection at Start](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/start/page.tsx)
- [Project route error handling](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/projects/%5Bid%5D/%5Bsection%5D/page.tsx)
- [Project workspace and overview](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/ProjectWorkspace.tsx)
- [Phase/navigation definitions](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/lib/model.ts)
- [Direction board](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/DirectionBoard.tsx)
- [Review workspace](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/Review.tsx)
- [Review canvas](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/ReviewCanvas.tsx)
- [Revision submission](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/RevisionSubmitDialog.tsx)
- [Save/recovery hook](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/useSave.tsx)
- [Leave guard](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/useUnsavedGuard.ts)
- [Recovery choices](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/RecoveryNotice.tsx)
- [Pages and Search editor](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/SiteContentEditor.tsx)
- [State editor](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/StateEditor.tsx)
- [Live schedule evaluation](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/lib/site/public.ts)
- [State command validation](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/api/projects/%5Bid%5D/command/route.ts)
- [Launch interface](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/LaunchWorkspace.tsx)
- [Launch check API](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/api/projects/%5Bid%5D/checks/route.ts)
- [Authoritative fresh-launch requirements](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/supabase/migrations/008_receipts_and_delivery.sql)
- [Domains](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/DomainsWorkspace.tsx)
- [Analytics](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/AnalyticsWorkspace.tsx)
- [Inbox](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/InboxWorkspace.tsx)
- [Billing](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/BillingWorkspace.tsx)
- [Checkout and return states](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/api/checkout/route.ts)
- [Project settings/connections](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/SettingsWorkspace.tsx)
- [Shared API errors](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/lib/client.ts)
- [Published customer renderer](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/site/CustomerSite.tsx)
- [Customer form](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/site/ContactForm.tsx)
- [Agency setup](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/components/SiteSetup.tsx)
- [Product styles](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/product.css)
- [Connected styles](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/connected.css)
- [Shared colour tokens](https://github.com/mlngaxri/clientportal-/blob/4fb682e878113d76ac8e146604c1d291dbc5aa32/app/tokens.css)

### Accessibility reference

The W3C materials were checked during this review. Applicable conditions and exceptions must be evaluated on the rendered interface.

- [WCAG 2.2 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): ordinary text generally needs 4.5:1; large text generally needs 3:1, with defined exceptions.
- [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): 24 by 24 CSS pixels or applicable spacing/other exceptions. A 44-pixel comfortable touch target is a design goal, not the blanket AA minimum.
- [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): assess the required narrow-width behaviour and applicable exceptions, rather than requiring every intrinsically two-dimensional canvas to flatten.
- [Focus Not Obscured Minimum](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html): sticky layers must not entirely hide the focused component.

## Completion boundary

The 81 findings are an actionable review backlog, not 81 claims that every feature is broken. Confirmed defects, visual evidence, recommendations and unverified acceptance work are marked separately. The next release should demonstrate resolved priority paths on the actual public destinations and representative staging integrations before it is described as finalized.
