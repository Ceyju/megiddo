export const novelHtml = `<header class="novel-header"><h1>Example &amp; Story</h1>
<figure class="cover"><img src="/server-1/example.jpg"></figure>
<div class="author"><a>Example Author</a></div>
<div class="header-stats"><span><strong>3,219</strong><small>Chapters</small></span><span><strong>Ongoing</strong><small>Status</small></span></div>
<div class="categories"><a>Fantasy</a></div></header>`;

export const chaptersHtml = `<p>Latest Release: <a href="/book/example/chapter-3219">Latest release</a></p>
<ul class="chapter-list">
<li><a href="/book/example/chapter-1"><strong class="chapter-title">Chapter 1</strong><time datetime="2026-10-19">Today</time></a></li>
<li><a href="/book/example/chapter-1.5"><strong class="chapter-title">Chapter 1.5</strong></a></li>
</ul><ul class="pagination"><li class="active">1</li>
<li><a href="/book/example/chapters?page=33">33</a></li>
<li><a href="/book/example/chapters?page=2" rel="next">Next</a></li></ul>`;

export const chapterHtml = `<h1 class="chapter-title">Chapter 1.5</h1><div id="chapter-container">
<div class="nf-ads">Outside advertisement</div><div id="content">
<p>Yes.</p><p>A paragraph with <em>inline emphasis</em> intact.<br>Another line.</p>
<div class="nf-ads"><p>Advertisement</p><iframe src="https://example.invalid"></iframe></div>
<script>unwanted()</script><p>The end.</p></div></div>
<div class="chapternav"><a rel="prev" href="/book/example/chapter-1">Previous</a><a rel="next" href="/book/example/chapter-3">Next</a></div>`;

export const listHtml = `<ul class="novel-list"><li><a href="/book/example"><h4 class="novel-title">Example &amp; Story</h4><img data-src="/server-1/example.jpg"><div class="novel-stats">3,219 Chapters</div></a></li>
<li><a href="/book/another"><h4 class="novel-title">Another Story</h4><img src="/server-1/another.jpg"><div class="novel-stats">17 Chapters</div></a></li></ul>`;
