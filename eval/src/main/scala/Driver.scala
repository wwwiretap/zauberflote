import org.openqa.selenium._
import org.openqa.selenium.remote._
import java.net.URL
import collection.JavaConversions._
import java.util.concurrent.TimeUnit._

object Driver {

  def run(numWindows: Int) {
    val capabilities = DesiredCapabilities.chrome()
    val url = new URL("http://localhost:9515")
    val driver = new RemoteWebDriver(url, capabilities)
    val jse = driver.asInstanceOf[JavascriptExecutor]
    for (i <- 1 until numWindows) {
      jse.executeScript("window.open();");
    }
    var windows = driver.getWindowHandles()
    def switchTo(window: String) {
      driver.switchTo().window(window)
    }
    for (window <- windows) {
      switchTo(window)
      jse.executeAsyncScript("""
        var callback = arguments[arguments.length - 1];
        callback();
        setTimeout(function() {
          // window.location = "http://localhost:8080/benchmark.html?http_only";
          window.location = "http://localhost:8080/benchmark.html";
        }, 0);
        """
      )
    }
    def done(): Boolean = {
      for (window <- windows) {
        switchTo(window)
        var res = jse.executeScript("""
          return (window.loadTime || "");
          """
        )
        if (res == null || res.asInstanceOf[String] == "") {
          return false
        }
      }
      return true
    }

    while (!done()) {
      Thread.sleep(1000)
    }

    for (window <- windows) {
      switchTo(window)
      var res = jse.executeScript("""
        return loadTime;
        """
      )
      println(res.asInstanceOf[String])
    }
    // driver.quit()
  }

  def main(args: Array[String]) {
    run(5)
    run(5)
  }

}
