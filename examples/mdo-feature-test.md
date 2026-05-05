Text block: plain text with **bold**, *italic*, `inline code`, ~~strike~~, and inline math $a^2+b^2=c^2$.

# Heading 1 - Complete MDO Feature Fixture

## Heading 2 - Basic, Lists, Content, Media, Technical

### Heading 3 - Round Trip Smoke Coverage

[Page block - Related child page](page:feature-child-page)

- Bulleted list item for /ul

1. Numbered list item for /ol

- [x] To-do list item for /todo

<!-- toggle -->
<details>
<summary>Toggle list summary for /toggle</summary>
Hidden toggle child content. This should survive parse and save.
</details>

> Quote block for /q.
> Second quote line.

<!-- callout -->
> Callout block for /callout.
> Use this to confirm callout formatting.

```javascript
const feature = "mdo";
console.log(`Testing ${feature} blocks`);
```

---

| Block | Command | Status |
| --- | --- | --- |
| Text | /text | ok |
| Media | /img /vid /aud /pdf | ok |

<!-- columns -->
Column one checks layout.
---col---
Column two checks editable column text.
---col---
Column three checks serialization.

![Image block from media_example](assets/feature-image.jpg)

[Video block from media_example](assets/feature-video.mp4)

[Audio block from media_example](assets/feature-audio.mp3)

[Generic file attachment](assets/feature-attachment.txt)

[Embed](data:text/html,%3C!doctype%20html%3E%3Chtml%3E%3Cbody%20style%3D%22font-family%3Asans-serif%3Bmargin%3A24px%22%3E%3Ch1%3EMDO%20embed%20test%3C%2Fh1%3E%3Cp%3EThis%20iframe%20is%20stored%20as%20a%20data%20URL%20so%20the%20fixture%20works%20offline.%3C%2Fp%3E%3C%2Fbody%3E%3C%2Fhtml%3E)

[Bookmark block - example.com](https://example.com/mdo-feature-test)

$$
\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
\begin{bmatrix} a & b \\ c & d \end{bmatrix}
$$

[PDF block from media_example](assets/feature-document.pdf)
