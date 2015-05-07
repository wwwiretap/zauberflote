import org.openqa.selenium._
import org.openqa.selenium.remote._
import java.net.URL
import collection.JavaConversions._
import java.util.concurrent.TimeUnit._

object Driver {

  val WINDOWS_PER_DRIVER = 5
  require(WINDOWS_PER_DRIVER > 0)

  type Window = (RemoteWebDriver, String)

  def switchTo(window: Window) {
    window._1.switchTo().window(window._2)
  }

  def openWindow(driver: RemoteWebDriver) {
    val jse = driver.asInstanceOf[JavascriptExecutor]
    jse.executeScript("window.open();")
  }

  def prepare(numWindows: Int): (Seq[(RemoteWebDriver, String)], Seq[RemoteWebDriver]) = {
    val dc = DesiredCapabilities.chrome()
    val url = new URL("http://localhost:9515")
    val mod = numWindows % WINDOWS_PER_DRIVER
    val numDrivers = numWindows / WINDOWS_PER_DRIVER + (if (mod != 0) 1 else 0)
    val drivers = for (i <- 1 to numDrivers) yield {
      new RemoteWebDriver(url, dc)
    }
    for {
      (driver, i) <- drivers.zipWithIndex
      toSpawn = if (i < drivers.length - 1 || mod == 0) WINDOWS_PER_DRIVER else mod
      _ <- 1 until toSpawn
    } {
      openWindow(driver)
    }
    val windows = drivers flatMap { driver =>
      driver.getWindowHandles() map { (driver, _) }
    }
    (windows, drivers)
  }

  def asyncLoadPage(window: Window, httpOnly: Boolean) {
    switchTo(window)
    val jse = window._1.asInstanceOf[JavascriptExecutor]
    jse.executeAsyncScript(s"""
      // hack to get around selenium having sync js executions
      var callback = arguments[arguments.length - 1];
      callback();
      setTimeout(function() {
        if (${httpOnly}) {
          window.location = "http://localhost:8080/benchmark.html?http_only";
        } else {
          window.location = "http://localhost:8080/benchmark.html";
        }
      }, 0);
      """
    )
  }

  def asyncLoadPages(windows: Seq[Window], httpOnly: Boolean) {
    for (window <- windows) {
      asyncLoadPage(window, httpOnly)
    }
  }

  def done(windows: Seq[Window]): Boolean = {
    for (window <- windows) {
      switchTo(window)
      val jse = window._1.asInstanceOf[JavascriptExecutor]
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

  def wait(windows: Seq[Window]) {
    while (!done(windows)) {
      Thread.sleep(500)
    }
  }

  def quit(drivers: Seq[RemoteWebDriver]) {
    for (driver <- drivers) {
      driver.quit()
    }
  }

  def loadTimes(windows: Seq[Window]): Seq[Float] = {
    for (window <- windows) yield {
      switchTo(window)
      val jse = window._1.asInstanceOf[JavascriptExecutor]
      var res = jse.executeScript("""
        return loadTime;
        """
      )
      res.asInstanceOf[String].toFloat
    }
  }

  def seedLeech(numSeeders: Int, numLeechers: Int): Float = {
    val total = numSeeders + numLeechers
    val (windows, drivers) = prepare(total)
    val (seeders, leechers) = windows splitAt numSeeders
    asyncLoadPages(seeders, true)
    wait(seeders)
    asyncLoadPages(leechers, false)
    wait(leechers)
    val times = loadTimes(leechers)
    times.sum / times.length
  }

  def main(args: Array[String]) {
    val s = 5
    for (l <- 1 to 5) {
      println(s"${s} seeders, ${l} leechers, ${seedLeech(s, l)} avg time")
    }
  }

}
