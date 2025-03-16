const getCloudDimensions = () => {
  const isMobile = window.innerWidth <= 480;
  const padding = isMobile ? 20 : 64; // Reduced padding for mobile
  const minHeight = isMobile ? window.innerHeight - 200 : 300; // Adjust for mobile to use most of viewport height
  const width = Math.min(800, window.innerWidth - padding * 2);
  const height = Math.max(minHeight, Math.min(isMobile ? window.innerHeight - 150 : 500, window.innerHeight - (isMobile ? 150 : 250)));
  return { width, height };
};

let { width, height } = getCloudDimensions();

let svg = d3.select("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

const tooltip = d3.select("#tooltip");

let slangData = [], emojiData = [];

const colors = ["#4B5945", "#66785F", "#91AC8F"];

// Dynamic font scaling based on screen width
function dynamicFontSize(baseSize) {
  const scaleFactor = Math.min(width / 800, height / 500);
  // Set minimum scale to prevent fonts from becoming too small
  const minScale = 0.5;
  const adjustedScale = Math.max(scaleFactor, minScale);
  
  // Adjust base size for mobile
  if (window.innerWidth <= 480) {
    return Math.max(baseSize * adjustedScale, 12); // Ensure minimum font size of 12px
  }
  
  return Math.max(baseSize * adjustedScale, 14); // Ensure minimum font size of 14px for larger screens
}

// Load datasets with better error handling
Promise.all([
  d3.csv('assets/Gen Z Slang.csv').catch(err => console.error("Slang CSV Load Error:", err)),
  d3.csv('assets/Gen Z Emojis.csv').catch(err => console.error("Emoji CSV Load Error:", err))
]).then(([slang, emojis]) => {
  if (!slang || !emojis) {
    console.error("One or both CSV files failed to load.");
    return;
  }

  slangData = slang.map(d => ({
    text: d.keyword,
    description: d.description,
    size: dynamicFontSize(12 + Math.random() * 40)
  }));

  emojiData = emojis.map(d => ({
    text: d.emoji,
    description: d.Description,
    size: dynamicFontSize(12 + Math.random() * 40)
  }));

  renderWordCloud('slang'); // Default cloud
});

function renderWordCloud(type) {
  if (!slangData.length || !emojiData.length) {
    console.error("Data not loaded yet!");
    return;
  }

  const isMobile = window.innerWidth <= 480;
  
  // Update dimensions
  const dims = getCloudDimensions();
  width = dims.width;
  height = dims.height;

  // Adjust layout dimensions for better space utilization
  const layoutWidth = width * (isMobile ? 0.95 : 0.85);
  const layoutHeight = height * (isMobile ? 0.95 : 0.9);

  // Update SVG dimensions
  d3.select("svg")
    .attr("width", width)
    .attr("height", height);
  
  // Center position adjusted for mobile
  const centerX = isMobile ? width * 0.5 : width * 0.45;
  svg.attr("transform", `translate(${centerX},${height / 2})`);

  svg.selectAll("*").remove();

  document.querySelectorAll('.tab').forEach(tab => {
    const isActive = tab.getAttribute('data-type') === type;
    tab.classList.toggle('active', isActive);
    tab.disabled = isActive;
  });

  const words = type === 'slang' ? slangData : emojiData;
  
  console.log(`Total words to render: ${words.length}`);

  // Different size mappings for slang and emoji
  if (type === 'slang') {
    // Keep existing slang sizing exactly as is
    const maxSize = 24;
    const minSize = 12;
    words.forEach(word => {
      word.size = minSize + (Math.random() * (maxSize - minSize));
    });
  } else {
    // New larger sizes only for emojis
    const maxEmojiSize = isMobile ? 32 : 42;
    const minEmojiSize = isMobile ? 24 : 32;
    words.forEach(word => {
      word.size = minEmojiSize + (Math.random() * (maxEmojiSize - minEmojiSize));
    });
  }

  const layout = d3.layout.cloud()
    .size([layoutWidth, layoutHeight])
    .words(words)
    .padding(type === 'emoji' ? (isMobile ? 8 : 10) : (isMobile ? 4 : 6)) // Adjusted padding for mobile
    .rotate(() => type === 'emoji' ? 0 : (Math.random() > 0.7 ? 90 : 0))
    .fontSize(d => d.size)
    .spiral('rectangular')
    .on("end", (renderedWords) => {
      console.log(`Words successfully placed: ${renderedWords.length}`);
      draw(renderedWords);
    });

  layout.start();
}

function draw(words) {
  const wordElements = svg.selectAll("text")
    .data(words)
    .enter().append("text")
    .attr("class", "word")
    .style("font-family", "'Fredoka', sans-serif")
    .style("font-weight", "600")
    .style("font-size", d => `${d.size}px`)
    .style("fill", () => colors[Math.floor(Math.random() * colors.length)])
    .attr("text-anchor", "middle")
    .attr("transform", d => `translate(${d.x}, ${d.y}) rotate(${d.rotate})`)
    .style("opacity", 0) // Start with opacity 0 for animation
    .text(d => d.text)
    .on("mouseover touchstart", (event, d) => {
      tooltip.style("visibility", "visible")
             .style("opacity", 1);
      document.getElementById("tooltip-title").innerText = d.text;
      document.getElementById("tooltip-body").innerText = d.description;
      
      wordElements.style("opacity", word => (word === d) ? 1 : 0.3);
    })
    .on("mousemove touchmove", (event) => {
      tooltip.style("top", (event.pageY - 10) + "px")
             .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout touchend", () => {
      tooltip.style("visibility", "hidden")
             .style("opacity", 0);
      
      wordElements.style("opacity", 1);
    });

  // Animate words appearing with staggered delay
  wordElements.transition()
    .duration(600)
    .delay((d, i) => 300 + i * 8) // Staggered delay based on index
    .style("opacity", 1);

  console.log(`Total elements rendered: ${wordElements.size()}`);
}

// Tabs event listeners
document.addEventListener('DOMContentLoaded', () => {
  const tabsContainer = document.querySelector('.tabs');
  
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const type = tab.getAttribute('data-type');
      
      // Set data attribute for the sliding animation
      tabsContainer.setAttribute('data-active-tab', type);
      
      renderWordCloud(type);
    });
  });
});

// Add window resize handler
window.addEventListener('resize', () => {
  if (document.querySelector('.tab.active')) {
    const type = document.querySelector('.tab.active').getAttribute('data-type');
    renderWordCloud(type);
  }
});
