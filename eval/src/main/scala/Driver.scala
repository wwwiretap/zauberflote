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
    try {
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
    } catch {
      case _: WebDriverException => return false
    }
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
    quit(drivers)
    times.sum / times.length
  }

  def httpOnly(numClients: Int): Float = {
    val (windows, drivers) = prepare(numClients)
    asyncLoadPages(windows, true)
    wait(windows)
    val times = loadTimes(windows)
    quit(drivers)
    times.sum / times.length
  }

  def fixedRatio(numLeechers: Int, seedToLeechRatio: Int): Float = {
    require (seedToLeechRatio > 0)
    seedLeech(numLeechers * seedToLeechRatio, numLeechers)
  }

  def httpToPeers(clientRange: Seq[Int], ratio: Int) {
    println("http vs peer to peer")
    println(s"for p2p, ${ratio} seeds for every leech")
    for (cl <- clientRange) {
      println(s"${cl} clients over p2p, ${fixedRatio(cl, ratio)} ms avg load time")
      println(s"${cl} clients over http, ${httpOnly(cl)} ms avg load time")
    }
  }

  def seedToLeech(seedRange: Seq[Int], leechRange: Seq[Int]) {
    println("seed x leech heat map")
    for (s <- seedRange) {
      for (l <- leechRange) {
        println(s"${s} seeders, ${l} leechers, ${seedLeech(s, l)} ms avg load time")
      }
    }
  }

  def main(args: Array[String]) {
    seedToLeech(seedRange = 1 to 10, leechRange = 1 to 10)
    httpToPeers(clientRange = 1 to 10, ratio = 3)
  }

}
