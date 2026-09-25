import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import './LegalPage.css';

// Starting-point Terms/Privacy content for a small, casual-scale app,
// not written or reviewed by a lawyer. Reasonable to launch with at
// this scale; worth real legal review if the app grows well beyond it.
export default function LegalPage() {
  useDocumentTitle('Terms & Privacy');

  return (
    <div className="legal-page">
      <Link className="legal-page-breadcrumb hit-area" to="/">
        ← commonplace
      </Link>
      <h1>Terms & Privacy</h1>
      <p className="legal-page-updated">Last updated: September 2026</p>

      <section id="terms">
        <h2>Terms of Service</h2>

        <h3>The basics</h3>
        <p>
          commonplace is a small, independently-run app for tracking and sharing what you
          read, watch, and listen to. Creating an account means you're agreeing to these
          terms. commonplace is operated from Australia by an individual developer.
        </p>

        <h3>Your account</h3>
        <p>
          You're responsible for keeping your password secure and for whatever happens
          under your account. Let us know at zedo12@gmail.com if you think someone else
          has gotten into it.
        </p>

        <h3>Your content</h3>
        <p>
          Anything you post, your Ledger entries, Journal clips, notes, your profile, is
          yours. Posting it just gives commonplace permission to store and display it as
          part of running the app: showing it on your profile, in Feed, in search, and so
          on. We don't claim ownership of it, and we don't sell it.
        </p>
        <p>
          Most content on commonplace is public by default, visible to anyone, not just
          people you follow. That's part of how the app works. Check the privacy setting
          on individual items (like Want to Consume entries) if you want to keep something
          private.
        </p>
        <p>
          You need to have the rights to anything you post, avatars, Journal media and
          clips, quoted passages, and so on. If we receive a credible copyright complaint
          about something you've posted, we'll remove it and may suspend your account.
          Copyright complaints can be sent to zedo12@gmail.com.
        </p>

        <h3>Acceptable use</h3>
        <p>Don't use commonplace to:</p>
        <ul>
          <li>Post anything illegal, harassing, or intended to harm someone</li>
          <li>Impersonate another person</li>
          <li>Try to break, abuse, or gain unauthorized access to the app or other accounts</li>
          <li>Scrape or bulk-collect other people's content or data</li>
        </ul>
        <p>We can suspend or remove accounts that violate this, at our discretion.</p>

        <h3>No warranty</h3>
        <p>
          commonplace is run by one person as an independent project, provided "as is."
          There's no guarantee it'll always be available or bug-free, and no guarantee
          your data will never be lost, so back up anything irreplaceable. We're not
          liable for damages arising from your use of the app, to the extent the law
          allows.
        </p>

        <h3>Changes</h3>
        <p>
          These terms might change as the app evolves. Continuing to use commonplace after
          a change means you accept the update.
        </p>
      </section>

      <section id="refund">
        <h2>Refunds</h2>
        <p>
          commonplace doesn't have any paid features, subscriptions, or purchases today, so
          there's nothing to refund. We'll update this section if that ever changes.
        </p>
      </section>

      <section id="privacy">
        <h2>Privacy Policy</h2>

        <h3>What we collect</h3>
        <p>
          Your email and password (we don't actually see your password, it's handled by
          our authentication provider). The profile info, content, and preferences you
          choose to add: name, username, bio, avatar photo, Ledger and Journal entries,
          follows, and settings like your theme and accent color.
        </p>

        <h3>Third parties involved in running the app</h3>
        <ul>
          <li>
            <strong>Supabase</strong>: hosts our database, handles authentication, and
            stores uploaded files (avatars, Journal media).
          </li>
          <li>
            <strong>Vercel</strong>: hosts the app itself.
          </li>
          <li>
            <strong>Google Books, OMDb, and the iTunes Search API (Apple)</strong>: when you
            search for a book, film, or podcast to add to your Ledger, your search text
            gets sent to these services to fetch results. Nothing else about your account
            is shared with them.
          </li>
          <li>
            <strong>Cover images</strong>: book covers, film posters, and podcast artwork
            load directly from the image servers of the services they come from: Amazon
            (film posters supplied by OMDb), Apple, and Google. Those servers see your IP
            address when the images load, the same as any image loaded from another site.
          </li>
          <li>
            <strong>hCaptcha</strong>: used on login, signup, and password-reset forms to
            help prevent automated abuse.
          </li>
          <li>
            <strong>Sentry</strong>: collects crash reports, the error and technical
            context around it, not your account data, so a one-person team can find and
            fix bugs. We don't have session replay or performance tracing turned on.
          </li>
          <li>
            <strong>Google Fonts</strong>: the app's typefaces load from Google's font CDN
            (fonts.googleapis.com and fonts.gstatic.com), which sees your IP address when
            those fonts load, the same as any site using Google Fonts.
          </li>
        </ul>

        <h3>EU/UK visitors</h3>
        <p>
          If you're in the EU or UK: the basis for processing your data is that it's
          needed to run the service you signed up for. You can ask for access to,
          correction of, deletion of, or an export of your data any time by emailing
          zedo12@gmail.com.
        </p>

        <h3>Your choices</h3>
        <p>
          You can edit or delete your own Ledger entries, Journal clips, and Want to
          Consume items any time. Full account deletion isn't available yet as a
          self-service option, so contact zedo12@gmail.com if you'd like your account
          removed in the meantime.
        </p>

        <h3>Children</h3>
        <p>commonplace isn't intended for children under 13.</p>

        <h3>Questions</h3>
        <p>Reach out to zedo12@gmail.com with anything about this policy or your data.</p>
      </section>

      <section id="cookies">
        <h2>Cookies</h2>
        <p>
          commonplace's own code doesn't use cookies at all, it uses your browser's local
          storage instead: for your signed-in session, for your light/dark mode
          preference (stored under the key <code>commonplace-theme</code>), and, in Safari
          on iPhone and iPad, to remember that you've dismissed the Add to Home Screen tip
          (stored under the key <code>commonplace-ios-install-hint-dismissed</code>). We
          don't set any advertising or analytics tracking cookies.
        </p>
        <p>
          hCaptcha, loaded only on the login, signup, and password-reset forms, sets its
          own cookies to help with bot and fraud detection.
        </p>
        <p>
          Since the only cookies in play are for security and fraud prevention, not
          marketing or analytics, we don't show a cookie-consent banner.
        </p>
      </section>
    </div>
  );
}
